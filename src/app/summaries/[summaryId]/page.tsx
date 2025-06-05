"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RootState, useStore } from "@/stores";

export default function SummaryPage() {
  const params = useParams();
  const summaryId = params.summaryId as string;
  const [isHydrated, setIsHydrated] = useState(false);
  const summary = useStore((state: RootState) => state.getSummary(summaryId));

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (!summary) {
    return <div>Summary not found</div>;
  }

  function getActionItems(actionItems: string[]) {
    if (!actionItems.length) {
      return null;
    }

    return (
      <div className="mb-4">
        <h2 className="text-lg font-bold">Action Items</h2>
        <ul className="list-disc list-inside">
          {actionItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  function getKeyPoints(keyPoints: string[]) {
    if (!keyPoints.length) {
      return null;
    }

    return (
      <div className="mb-4">
        <h2 className="text-lg font-bold">Key Points</h2>
        <ul className="list-disc list-inside">
          {keyPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  function getNextSteps(nextSteps: string[]) {
    if (!nextSteps.length) {
      return null;
    }

    return (
      <div className="mb-4">
        <h2 className="text-lg font-bold">Next Steps</h2>
        <ul className="list-disc list-inside">
          {nextSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{summary.title}</h1>
      <div className="text-lg mb-4">{summary.summary}</div>
      {getKeyPoints(summary.key_points)}
      {getActionItems(summary.action_items)}
      {getNextSteps(summary.next_steps)}
      <div>
        <Link
          href={`/session?summary=${summary.id}`}
          className="btn btn-primary"
        >
          Continue this Session
        </Link>
      </div>
    </div>
  );
}
