"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isWarmingAssistant, setIsWarmingAssistant] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId] = useState<string | null>(
    "asst_mz9EL6TLq5zy4OsBBJnsUhcQ"
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize or get thread on component mount
  useEffect(() => {
    const initializeThread = async () => {
      try {
        // Create a new thread only if we don't have one yet
        if (!threadId) {
          // Replace direct OpenAI call with API route
          const response = await fetch("/api/thread", {
            method: "POST"
          });
          const data = await response.json();
          setThreadId(data.threadId);

          // Send initial message via API route
          const messageRes = await fetch("/api/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: "Hello",
              threadId: data.threadId,
              assistantId: assistantId
            })
          });
          const messageData = await messageRes.json();

          setIsWarmingAssistant(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: messageData.response }
          ]);
        }
      } catch (error) {
        console.error("Error initializing thread:", error);
      }
    };

    initializeThread();
  }, [threadId, assistantId]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      // Reset chunks on start
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk received, size:", event.data.size);
          audioChunksRef.current.push(event.data);
        }
      };

      // Add an onstop handler to process audio *after* recording stops
      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          processAudioWithOpenAI();
        } else {
          console.error("No audio chunks recorded.");
          // Handle the case where no audio was recorded (e.g., show an error message)
          setMessages((prev) => [
            ...prev.slice(0, -1), // Remove the "Processing..." message
            { role: "user", content: "No audio recorded. Please try again." },
            {
              role: "assistant",
              content: "I didn't hear anything. Could you try recording again?"
            }
          ]);
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    console.log("Stopping recording...");
    mediaRecorderRef.current.stop(); // This will trigger the 'onstop' event handler
    setIsRecording(false);

    // Close audio tracks - moved here to ensure they are closed after stop
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());

    // Add a temporary user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Processing your message..." }
    ]);
    setIsLoading(true);
  };

  const processAudioWithOpenAI = async () => {
    try {
      // Get the actual MIME type from the MediaRecorder
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const fileExtension = mimeType.includes("webm")
        ? "webm"
        : mimeType.includes("mp4")
          ? "mp4"
          : mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("wav")
              ? "wav"
              : "webm";

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mimeType
      });

      console.log(
        `Using audio format: ${mimeType}, extension: ${fileExtension}`
      );

      // Use new API route for transcription
      const transcribedText = await transcribeAudioWithAPI(
        audioBlob,
        fileExtension
      );

      // Update user message with transcribed text
      setMessages((prev) => {
        const messages = [...prev];
        // Replace the temporary message with the transcribed text
        messages[messages.length - 1].content = transcribedText;
        return messages;
      });

      // Use new API route for sending messages
      const assistantResponse = await sendMessageToAssistant(
        transcribedText,
        threadId || ""
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantResponse }
      ]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing audio with OpenAI:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "user", content: "Failed to process audio." },
        {
          role: "assistant",
          content:
            "Sorry, I had trouble processing your message. Could you try again?"
        }
      ]);
      setIsLoading(false);
    }
  };

  // New function to transcribe audio via API
  const transcribeAudioWithAPI = async (audioBlob: Blob, extension: string) => {
    const formData = new FormData();
    // Specify the filename with correct extension to ensure the server recognizes it correctly
    formData.append("file", audioBlob, `recording.${extension}`);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.text || "No transcription returned";
  };

  // New function to send messages to assistant via API
  const sendMessageToAssistant = async (text: string, threadId: string) => {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        threadId,
        assistantId: assistantId
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.response;
  };

  return (
    <div className="flex justify-center w-full min-h-screen bg-base-200 p-1">
      <div className="container max-w-md flex flex-col h-screen bg-base-100 rounded-xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-neutral text-neutral-content p-4 flex items-center gap-2">
          <div className="flex-1">
            <h1 className="text-xl font-bold">🌴 DatePalm</h1>
          </div>
        </div>

        {/* Chat container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div>
                <h3 className="text-lg font-semibold">Welcome to DatePalm</h3>
                <p className="text-base-content/70 mt-2">
                  {isWarmingAssistant
                    ? "Please wait while the assistant is warming up..."
                    : "Tap the microphone button below to start sharing your thoughts"}
                </p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`chat ${message.role === "user" ? "chat-end" : "chat-start"}`}
              >
                <div
                  className={`chat-bubble ${message.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="chat chat-start">
              <div className="chat-bubble chat-bubble-secondary flex gap-1 items-center">
                <span className="loading loading-dots loading-sm"></span>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {!isLoading && !isRecording && (
            <div className="text-center text-base-content/50 italic text-sm mt-2">
              Press the microphone button to respond
            </div>
          )}

          <div className="h-[50px] min-h-[50px] w-full"></div>
        </div>

        {/* Recording controls */}
        <div className="p-4 border-t border-base-300 flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`btn btn-circle ${isRecording ? "btn-error" : "btn-primary"} btn-lg`}
            disabled={isLoading || isWarmingAssistant}
            title={isRecording ? "Press to Stop Recording" : "Press to Record"}
          >
            {isRecording ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" strokeWidth="2" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="bg-error text-error-content px-4 py-2 rounded-full text-sm font-medium animate-pulse">
              Recording...Press below to stop
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
