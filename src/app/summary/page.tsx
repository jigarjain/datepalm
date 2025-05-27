"use client";

import React from "react";
import { RootState, useStore } from "@/stores";

export default function SummaryPage() {
  const summaries = useStore((state: RootState) => state.summaries);

  return (
    <>
      {summaries.reverse().map((summary) => (
        <div className="card shadow-sm" key={summary.id}>
          <div className="card-body">
            <h2 className="card-title">{summary.title}</h2>
            <p>{summary.summary}</p>
          </div>
        </div>
      ))}
    </>
  );
}
