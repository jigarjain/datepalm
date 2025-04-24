"use client";

import React from "react";

export default function App({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-4xl font-bold">DatePalm</div>
      {children}
    </div>
  );
}
