"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatScreen, { type Messages } from "./components/ChatScreen";
import NameScreen from "./components/NameScreen";
import { UserData, getUserData, updateUserData } from "./lib/db";

enum Screen {
  NameScreen,
  ChatScreen
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [screen, setScreen] = useState<Screen>(Screen.NameScreen);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const tracks = useRef<RTCRtpSender[] | null>(null);

  const [messages, setMessages] = useState<Messages[]>([]);

  function getInstructionsForAssistant() {
    return `
      You are a relationship coach. You are helping ${userData?.name} who is in a relationship with ${userData?.partnerName} to improve their relationship.
    `;
  }

  async function startSession() {
    try {
      if (!isSessionStarted) {
        console.log("Starting session");
        setIsSessionStarted(true);

        const res = await fetch("/api/token", {
          method: "POST"
        });

        const session = await res.json();

        console.log("Session Received", session);

        const pc = new RTCPeerConnection();

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

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        stream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, stream);
          if (sender) {
            tracks.current = [...(tracks.current || []), sender];
          }
        });

        // Set up data channel for sending and receiving events
        const dc = pc.createDataChannel("oai-events");
        setDataChannel(dc);

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

        console.log(answer);
        await pc.setRemoteDescription(answer);

        peerConnection.current = pc;
      }
    } catch (err) {
      console.error("Error starting session:", err);
    }
  }

  function stopSession() {
    dataChannel?.send(
      JSON.stringify({
        type: "response"
      })
    );
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionStarted(false);
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);
    setIsListening(false);
    setIsSpeaking(false);
    audioTransceiver.current = null;
  }

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
      console.log("Recieved Event", event);

      if (
        event.type === "conversation.item.input_audio_transcription.completed"
      ) {
        setMessages([...messages, { role: "user", content: event.transcript }]);
      }

      if (event.type === "response.audio_transcript.done") {
        setMessages([
          ...messages,
          { role: "assistant", content: event.transcript }
        ]);
      }

      if (event.type === "output_audio_buffer.stopped") {
        setIsSpeaking(false);
        setIsListening(true);
      }

      if (event.type === "output_audio_buffer.started") {
        setIsListening(false);
        setIsSpeaking(true);
      }
    }

    function handleDataChannelOpen() {
      setIsSessionActive(true);
      // Send session config
      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: getInstructionsForAssistant(),
          turn_detection: {
            prefix_padding_ms: 500,
            silence_duration_ms: 1500,
            threshold: 0.7,
            type: "server_vad"
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

    dataChannel.addEventListener("message", handleDataChannelMessage);
    dataChannel.addEventListener("open", handleDataChannelOpen);

    return () => {
      dataChannel.removeEventListener("message", handleDataChannelMessage);
      dataChannel.removeEventListener("open", handleDataChannelOpen);
    };
  }, [dataChannel, sendClientEvent, getInstructionsForAssistant, setMessages]);

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

  useEffect(() => {
    // Update userData when the component mounts
    const userData = getUserData();
    if (userData) {
      setUserData(userData);
    }

    if (userData?.partnerName && userData?.name) {
      setScreen(Screen.ChatScreen);
    }
  }, []);

  const handleSessionToggle = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
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
            isListening={isListening}
            isSessionStarted={isSessionStarted}
            isSessionActive={isSessionActive}
            handleSessionToggle={handleSessionToggle}
          />
        )}
      </div>
    </div>
  );
}
