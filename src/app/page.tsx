"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatScreen, { type Messages } from "./components/ChatScreen";
import NameScreen from "./components/NameScreen";
import { UserData, getUserData, updateUserData } from "./lib/db";

enum Screen {
  NameScreen,
  ChatScreen
}

function getInstructionsForAssistant(userData: UserData) {
  return `
    You are a relationship coach.
    You are helping ${userData?.name} who is in a relationship with ${userData?.partnerName} to improve their relationship.
    Firstly, greet the user by addressing them by name & introduce yourself.
    Keep your introductory message short and concise. Introduce yourself as a relationship coach and ask the user to start the conversation by clicking on the "Start Recording" button below
  `;
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [screen, setScreen] = useState<Screen>(Screen.NameScreen);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [hasAudioChunks, setHasAudioChunks] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [messages, setMessages] = useState<Messages[]>([]);

  useEffect(() => {
    // Update userData when the component mounts
    const userData = getUserData();
    if (userData) {
      setUserData(userData);
    }

    if (userData?.partnerName && userData?.name) {
      // setScreen(Screen.ChatScreen);
    }
  }, []);

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: Record<string, unknown>) => {
      if (dataChannel) {
        message.event_id = message.event_id || crypto.randomUUID();
        dataChannel.send(JSON.stringify(message));
      } else {
        console.error(
          "Failed to send message - no data channel available",
          message
        );
      }
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
        console.log("Previous Messages", messages.length);
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: event.transcript }
        ]);
      }

      if (
        event.type === "output_audio_buffer.stopped"
        // || event.type === "response.done"
      ) {
        setIsSpeaking(false);
      }

      if (event.type === "output_audio_buffer.started") {
        setIsSpeaking(true);
      }
    }

    function handleDataChannelOpen() {
      setIsSessionActive(true);
      // Send session config
      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: getInstructionsForAssistant(userData!),
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
      }, 500);
    }

    function handleDataChannelClose() {
      console.log("Data Channel Closed");
    }

    console.log("Adding DataChannel Listeners");
    dataChannel.addEventListener("message", handleDataChannelMessage);
    dataChannel.addEventListener("open", handleDataChannelOpen);
    dataChannel.addEventListener("close", handleDataChannelClose);

    return () => {
      console.log("Removing DataChannel Listeners");
      dataChannel.removeEventListener("message", handleDataChannelMessage);
      dataChannel.removeEventListener("open", handleDataChannelOpen);
      dataChannel.removeEventListener("close", handleDataChannelClose);
    };
  }, [dataChannel, sendClientEvent, setMessages]);

  const handleStartSession = useCallback(async () => {
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

        await pc.setRemoteDescription(answer);
        console.log("Set remote description");
        console.log("Session started");
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  }, [isSessionStarted, peerConnection]);

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
  }

  async function handleStartRecording() {
    audioChunksRef.current = [];
    setHasAudioChunks(false);
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
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (audioChunksRef.current.length > 0) {
        setHasAudioChunks(true);
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  }

  function handleStopRecording() {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop(); // This will trigger the 'onstop' event handler

    // Close audio tracks - moved here to ensure they are closed after stop
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());

    setIsRecording(false);

    console.log("Stopped recording");
  }

  async function handleSendMessage() {
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

    console.log(
      `Audio length: ${channelData.length} samples, chunking into ${samplesPerChunk} sample chunks`
    );

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

      console.log(
        `Sending chunk ${Math.floor(i / samplesPerChunk) + 1}, size: ${base64Chunk.length} bytes`
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
    setHasAudioChunks(false);
  }

  const updateNames = (name: string, partnerName: string) => {
    const newUserData = {
      ...userData,
      name,
      partnerName
    };
    updateUserData(newUserData);
    setUserData(newUserData);
    setScreen(Screen.ChatScreen);
  };

  return (
    <div className="flex justify-center w-full min-h-screen bg-base-200">
      <div className="container max-w-lg flex flex-col h-screen bg-base-100 overflow-hidden shadow-xl">
        {screen === Screen.NameScreen && (
          <NameScreen
            nameOfUser={userData?.name || ""}
            nameOfPartner={userData?.partnerName || ""}
            updateNames={updateNames}
          />
        )}
        {screen === Screen.ChatScreen && (
          <ChatScreen
            messages={messages}
            isSpeaking={isSpeaking}
            isRecording={isRecording}
            isSessionStarted={isSessionStarted}
            isSessionActive={isSessionActive}
            hasAudioChunks={hasAudioChunks}
            handleStartSession={handleStartSession}
            handleStopSession={handleStopSession}
            handleSendMessage={handleSendMessage}
            handleStartRecording={handleStartRecording}
            handleStopRecording={handleStopRecording}
          />
        )}
      </div>
    </div>
  );
}
