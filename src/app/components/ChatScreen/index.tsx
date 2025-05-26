import React, { useEffect, useRef } from "react";

export type Messages = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  isRecording: boolean;
  isSpeaking: boolean;
  isSessionActive: boolean;
  isSessionStarted: boolean;
  hasAudioChunks: boolean;
  messages: Messages[];
  handleStartSession: () => void;
  handleStopSession: () => void;
  handleSendMessage: () => void;
  handleStartRecording: () => void;
  handleStopRecording: () => void;
};

function getActionAttributes(
  isRecording: boolean,
  isSpeaking: boolean,
  hasAudioChunks: boolean,
  handleSendMessage: () => void,
  handleStartRecording: () => void,
  handleStopRecording: () => void
) {
  const buttons = [];

  if (hasAudioChunks && !isRecording) {
    buttons.push({
      onClick: handleSendMessage,
      className: "btn btn-success btn-wide",
      label: "Send Response",
      disabled: false
    });
  }

  if (isRecording) {
    buttons.push({
      onClick: handleStopRecording,
      className: "btn btn-neutral",
      label: "Stop Recording",
      disabled: false
    });
  }

  if (!isRecording && !hasAudioChunks) {
    buttons.push({
      onClick: handleStartRecording,
      className: "btn btn-neutral",
      label: "Start Recording",
      disabled: isSpeaking
    });
  }

  return buttons;
}

export default function ChatScreen({
  messages,
  isRecording,
  isSpeaking,
  isSessionActive,
  isSessionStarted,
  hasAudioChunks,
  handleStartSession,
  handleStopSession,
  handleSendMessage,
  handleStartRecording,
  handleStopRecording
}: Props) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Start the session on initial page mount
  useEffect(() => {
    if (!isSessionStarted) {
      console.log("Calling handleStartSession");
      handleStartSession();
    }
  }, [handleStartSession]);

  const actionAttributes = getActionAttributes(
    isRecording,
    isSpeaking,
    hasAudioChunks,
    handleSendMessage,
    handleStartRecording,
    handleStopRecording
  );

  return (
    <div className="flex flex-col justify-between h-full">
      {/* Scrollable AI content */}
      <div
        className="flex flex-col flex-1 overflow-y-auto"
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
        <div className="bg-base-100 p-4 border-t border-base-300 text-center">
          <div className="flex w-full justify-evenly">
            {actionAttributes.map((action, index) => (
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
              disabled={!isSessionActive || isSpeaking}
            >
              Stop Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
