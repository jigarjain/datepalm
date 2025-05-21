import React, { useEffect, useRef } from "react";

export type Messages = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  isListening: boolean;
  isSpeaking: boolean;
  messages: Messages[];
  handleSessionToggle: () => void;
  isSessionActive: boolean;
  isSessionStarted: boolean;
};

export default function ChatScreen({
  messages,
  isListening,
  isSpeaking,
  handleSessionToggle,
  isSessionActive,
  isSessionStarted
}: Props) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Scrollable AI content */}
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        ref={chatContainerRef}
      >
        {!messages.length && !isSessionActive && !isSessionStarted && (
          <div className="text-base-content text-lg p-8 text-center">
            Once you feel ready, click the button below to start the session.
          </div>
        )}

        {!isSessionActive && isSessionStarted && (
          <div className="text-base-content text-lg p-8 text-center">
            Starting Session...
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
        {isSessionActive && isListening && (
          <div className="absolute -top-10  left-0 right-0 flex justify-center text-base-content text-sm font-medium animate-pulse">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            &nbsp;Your turn. Relatable is listening...
          </div>
        )}
        {isSessionActive && isSpeaking && (
          <div className="absolute -top-10  left-0 right-0 flex justify-center text-base-content text-sm font-medium animate-pulse">
            Relatable is speaking...
          </div>
        )}
        <div className="bg-base-100 p-4 border-t border-base-300 text-center">
          <button
            onClick={handleSessionToggle}
            className={`btn btn-neutral btn-wide`}
            disabled={isSessionStarted && !isSessionActive}
          >
            {isSessionActive ? "Stop Session" : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
