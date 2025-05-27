"use client";

import React from "react";

export default function App({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex justify-center w-full min-h-screen bg-base-200">
      <div className="container max-w-lg flex flex-col h-screen bg-base-100 overflow-hidden shadow-xl">
        {children}
      </div>
    </div>
  );
}
