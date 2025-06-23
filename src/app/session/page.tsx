"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Summary, UserData } from "@/types";
import { RootState, useStore } from "@/stores";
import { SESSION_PROMPT } from "@/prompts/session";

export type Messages = {
  role: "user" | "assistant";
  content: string;
};

function getInstructionsForAssistant(
  userData: UserData,
  summary: Summary | null
) {
  let prompt = SESSION_PROMPT.replace("{user_name}", userData?.name).replace(
    "{partner_name}",
    userData?.partnerName
  );

  if (summary) {
    const summaryForAI = {
      title: summary.title,
      summary: summary.summary,
      key_points: summary.key_points,
      action_items: summary.action_items,
      next_steps: summary.next_steps
    };

    prompt += `\n\nHere is the summary of the previous conversation so far in json stringified format: ${JSON.stringify(summaryForAI)}`;
  }

  return prompt;
}

function SessionPageContent() {
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSendingAudio, setIsSendingAudio] = useState(false);
  const [messages, setMessages] = useState<Messages[]>([]);
  const [isSummarising, setIsSummarising] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const userData = useStore((state: RootState) => state.userData);
  const addSummary = useStore((state: RootState) => state.addSummary);
  const searchParams = useSearchParams();
  const summaryId = searchParams.get("summaryId");
  const summary =
    useStore((state: RootState) => state.getSummary(summaryId || "")) || null;

  useEffect(() => {
    handleStartSession();

    return () => {
      // cleanup
      if (audioElement.current) {
        audioElement.current.pause();
        audioElement.current.srcObject = null;
        audioElement.current.remove();
        audioElement.current = null;
      }
    };
  }, []);

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: Record<string, unknown>) => {
      if (!dataChannel || dataChannel.readyState !== "open") {
        console.error(
          "Failed to send message - no open data channel available",
          message
        );
        return;
      }

      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
    },
    [dataChannel]
  );

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (!dataChannel) {
      return;
    }

    function handleDataChannelMessage(e: MessageEvent) {
      const event = JSON.parse(e.data);
      console.log("Recieved Event", event.type);

      if (
        event.type === "conversation.item.input_audio_transcription.completed"
      ) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "user", content: event.transcript }
        ]);
      }

      if (event.type === "response.audio_transcript.done") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: event.transcript }
        ]);
      }

      if (event.type === "output_audio_buffer.started") {
        setIsSpeaking(true);
      }

      if (event.type === "output_audio_buffer.stopped") {
        setIsSpeaking(false);
      }
    }

    function handleDataChannelOpen() {
      setIsSessionActive(true);
      // Send session config
      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: getInstructionsForAssistant(userData!, summary),
          modalities: ["text", "audio"],
          turn_detection: null,
          input_audio_transcription: {
            model: "whisper-1"
          }
        }
      };
      sendClientEvent(sessionUpdate);
      console.log("Session update sent:", sessionUpdate);

      window.setTimeout(() => {
        // Triggering the assistant to start the conversation
        sendClientEvent({
          type: "response.create"
        });
        console.log("Assistant triggered");
      }, 300);
    }

    console.log("Adding data channel listeners");
    dataChannel.addEventListener("message", handleDataChannelMessage);
    dataChannel.addEventListener("open", handleDataChannelOpen);

    return () => {
      console.log("Removing data channel listeners");
      dataChannel.removeEventListener("message", handleDataChannelMessage);
      dataChannel.removeEventListener("open", handleDataChannelOpen);
    };
  }, [dataChannel, sendClientEvent, setMessages]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleStartSession() {
    try {
      if (!isSessionStarted && !peerConnection.current) {
        console.log("Starting session");
        setIsSessionStarted(true);

        const pc = new RTCPeerConnection();
        peerConnection.current = pc;

        const res = await fetch("/api/token", {
          method: "POST"
        });

        const session = await res.json();
        console.log("Session Received", session);

        // Set up to play remote audio from the model
        if (!audioElement.current) {
          audioElement.current = document.createElement("audio");
        }
        audioElement.current.autoplay = true;
        pc.ontrack = (e) => {
          if (audioElement.current) {
            audioElement.current.srcObject = e.streams[0];
          }
        };

        // Add audio transceiver to ensure audio media section in the offer
        pc.addTransceiver("audio", { direction: "recvonly" });

        // Set up data channel for sending and receiving events
        const dc = pc.createDataChannel("oai-events");
        setDataChannel(dc);
        console.log("Created data channel");

        // Start the session using the Session Description Protocol (SDP)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(
          `https://api.openai.com/v1/realtime?model=${session.model}`,
          {
            method: "POST",
            body: offer.sdp,
            headers: {
              Authorization: `Bearer ${session.client_secret.value}`,
              "Content-Type": "application/sdp"
            }
          }
        );

        const answer: RTCSessionDescriptionInit = {
          type: "answer",
          sdp: await sdpResponse.text()
        };

        console.log("Setting remote description");
        await pc.setRemoteDescription(answer);

        console.log("Session started");
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  }

  function handleStopSession() {
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (audioElement.current) {
      audioElement.current.srcObject = null;
      audioElement.current.remove();
      audioElement.current = null;
    }

    setIsSessionStarted(false);
    setIsSessionActive(false);
    setDataChannel(null);
    setIsSpeaking(false);
    setIsRecording(false);
    handleStopRecording();
    peerConnection.current = null;
    audioChunksRef.current = [];

    // Start summarising the conversation
    handleSummariseConversation();
  }

  async function handleStartRecording() {
    audioChunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 16000
    });

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      console.log("mediaRecorder:ondataavailable event triggered");
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    console.log("mediaRecorder started recording");
    setIsRecording(true);
  }

  function handleStopRecording() {
    setIsRecording(false);
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop(); // This will trigger the 'onstop' event handler

    // Close audio tracks - moved here to ensure they are closed after stop
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());

    console.log("mediaRecorder stopped recording");
  }

  async function handleSendMessage() {
    setIsSendingAudio(true);
    handleStopRecording();
    // Added await to ensure the recording is stopped & the onstop event is triggered
    // This is a workaround to ensure the audioChunksRef.current has the recorded data
    // from the onstop event
    await new Promise((resolve) => setTimeout(resolve, 100));

    const audioBlob = new Blob(audioChunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || "audio/webm"
    });

    const audioContext = new OfflineAudioContext(1, 1, 24000);
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    // Calculate chunk size to stay under 32KB
    const maxBytesPerChunk = 32 * 1024; // 32KB
    const samplesPerChunk = Math.floor(maxBytesPerChunk / 2.67); // Account for base64 overhead

    for (let i = 0; i < channelData.length; i += samplesPerChunk) {
      const chunk = channelData.slice(i, i + samplesPerChunk);
      const pcmChunk = new Int16Array(chunk.length);

      for (let j = 0; j < chunk.length; j++) {
        const sample = Math.max(-1, Math.min(1, chunk[j]));
        pcmChunk[j] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      const base64Chunk = btoa(
        new Uint8Array(pcmChunk.buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      sendClientEvent({
        type: "input_audio_buffer.append",
        audio: base64Chunk
      });

      // Small delay between chunks to avoid overwhelming the channel
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    sendClientEvent({
      type: "input_audio_buffer.commit"
    });
    sendClientEvent({
      type: "response.create"
    });

    audioChunksRef.current = [];
    setIsSendingAudio(false);
    console.log("Recorded audio sent");
  }

  async function handleSummariseConversation() {
    setIsSummarising(true);

    const payload = {
      messages: messages
    };

    setMessages([]);

    const response = await fetch("/api/summary", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    const summaryData = JSON.parse(data.choices[0].message.content);

    console.log("Summary Data", summaryData);

    const summary: Summary = {
      id: crypto.randomUUID(),
      title: summaryData.title,
      summary: summaryData.summary,
      key_points: summaryData.key_points,
      action_items: summaryData.action_items,
      next_steps: summaryData.next_steps,
      created_at: new Date().toISOString()
    };

    addSummary(summary);
    setIsSummarising(false);

    if (userData?.email) {
      router.push("/summaries");
    } else {
      router.push("/subscribe");
    }
  }

  const actionButtons = [];

  if (!isRecording && !isSendingAudio) {
    actionButtons.push({
      onClick: handleStartRecording,
      className: "btn btn-neutral",
      label: "Start Recording",
      disabled:
        (!isSessionActive && isSessionStarted) ||
        isSpeaking ||
        isSendingAudio ||
        isSummarising
    });
  } else {
    actionButtons.push({
      onClick: handleSendMessage,
      className: "btn btn-success btn-wide",
      label: "Send Response",
      disabled: isSendingAudio
    });
  }

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Scrollable AI content */}
      <div
        className="flex flex-col flex-1 overflow-y-auto pb-34"
        ref={chatContainerRef}
      >
        {!isSessionActive && isSessionStarted && (
          <div className="text-base-content text-lg p-8 text-center">
            Starting Session. Please wait...
          </div>
        )}

        {!messages.length && isSessionActive && !isSpeaking && (
          <div className="text-base-content text-lg p-8 text-center">
            Once you feel ready, click the &quot;Start Recording&quot; button
            below to record your answer.
          </div>
        )}

        {isSummarising && (
          <div className="text-base-content text-lg p-8 text-center">
            Summarising conversation. Please wait...
          </div>
        )}

        <div className="whitespace-pre-line text-base-content text-lg p-8">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat ${message.role === "assistant" ? "chat-start" : "chat-end"}`}
            >
              <div className="chat-bubble">{message.content}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col relative">
        {/* Listening indicator */}
        {isSessionActive && isRecording && (
          <div className="absolute -top-10  left-0 right-0 flex justify-center text-base-content text-sm font-medium animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="red"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            Recording...
          </div>
        )}
        {isSessionActive && isSpeaking && (
          <div className="absolute -top-10  left-0 right-0 flex justify-center text-base-content text-sm font-medium animate-pulse">
            Relatable is speaking...
          </div>
        )}
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-base-100 border-t border-base-300 p-4 text-center">
          <div className="flex justify-evenly">
            {actionButtons.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={action.className}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
            <div className="divider divider-horizontal"></div>
            <button
              onClick={handleStopSession}
              className="btn btn-error btn-outline"
              disabled={!isSessionActive || isSpeaking || isSummarising}
            >
              Stop Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SessionPageContent />
    </Suspense>
  );
}
