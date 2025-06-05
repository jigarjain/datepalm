"use client";

import React from "react";
import Link from "next/link";
import { RootState, useStore } from "@/stores";

export default function SummariesPage() {
  const summaries = useStore((state: RootState) => state.summaries);

  return (
    <>
      {summaries.reverse().map((summary) => (
        <Link href={`/summaries/${summary.id}`} key={summary.id}>
          <div className="card m-2 mb-1 bg-base-300">
            <div className="card-body">
              <h2 className="card-title">{summary.title}</h2>
              <p>{summary.summary}</p>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
