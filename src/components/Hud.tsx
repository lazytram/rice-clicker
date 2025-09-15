"use client";

import React from "react";
import { useGlobalClicks } from "@/hooks/useGlobalClicks";
import { getEmojiForGlobalCount } from "@/lib/japanEmojis";

export default function Hud() {
  const { data: globalClicks = 0 } = useGlobalClicks();

  const formatted = React.useMemo(() => {
    try {
      return globalClicks.toLocaleString();
    } catch {
      return String(globalClicks);
    }
  }, [globalClicks]);

  const { emoji, rangeStart, rangeEnd } = React.useMemo(
    () => getEmojiForGlobalCount(globalClicks),
    [globalClicks]
  );

  return (
    <div className="inline-hud select-none text-sm align-middle items-center">
      <span className="opacity-70">Global:</span>
      <span className={`metric-value`}>{formatted}</span>
      <style jsx>{`
        .metric-value {
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          color: #0f172a;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 2px 8px;
          border-radius: 999px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(6px);
        }
        .metric-emoji {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 6px;
          font-size: 16px;
          line-height: 1;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          padding: 2px 6px;
          border-radius: 999px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(6px);
        }
      `}</style>
      <span className="metric-emoji" title={`Palier ${rangeStart}–${rangeEnd}`}>
        {emoji}
      </span>
    </div>
  );
}
