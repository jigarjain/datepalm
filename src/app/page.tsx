"use client";

import { useEffect, useRef, useState } from "react";
import OpenAI from "openai";
import { sendToAssistant, transcribeAudio } from "@/lib/openai";

// Note: In a production app, you would not expose your API key in client-side code
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function Home() {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isWarmingAssistant, setIsWarmingAssistant] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

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
          console.time("Warming assistant");
          const thread = await openai.beta.threads.create();
          setThreadId(thread.id);
          console.log("Created new thread:", thread.id);

          const assistantResponse = await sendToAssistant("Hello", thread.id);
          console.timeEnd("Warming assistant");
          setIsWarmingAssistant(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: assistantResponse }
          ]);
        }
      } catch (error) {
        console.error("Error initializing thread:", error);
      }
    };

    initializeThread();
  }, [threadId]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
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

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    // Close audio tracks
    mediaRecorderRef.current.stream
      .getTracks()
      .forEach((track) => track.stop());

    // Add a temporary user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Processing your message..." }
    ]);
    setIsLoading(true);

    // Process the audio
    setTimeout(() => {
      processAudioWithOpenAI();
    }, 500);
  };

  const processAudioWithOpenAI = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm"
      });

      const transcribedText = await transcribeAudio(audioBlob);

      // Update user message with transcribed text
      setMessages((prev) => {
        const messages = [...prev];
        // Replace the temporary message with the transcribed text
        messages[messages.length - 1].content = transcribedText;
        return messages;
      });

      const assistantResponse = await sendToAssistant(
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
        </div>

        {/* Recording controls */}
        <div className="p-4 border-t border-base-300 flex justify-center">
          <div
            className="tooltip"
            data-tip={
              isRecording ? "Press to Stop Recording" : "Press to Record"
            }
          >
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`btn btn-circle ${isRecording ? "btn-error" : "btn-primary"} btn-lg`}
              disabled={isLoading || isWarmingAssistant}
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
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="bg-error text-error-content px-4 py-2 rounded-full text-sm font-medium animate-pulse">
              Recording...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
