"use client";

import React from "react";
import Link from "next/link";
import { useRaceResults } from "@/hooks/useRaceResults";
import { useGlobalClicks } from "@/hooks/useGlobalClicks";
import { getEmojiForGlobalCount } from "@/lib/japanEmojis";

const isActive = false;

type Props = {
  mode?: "clicker" | "race";
  onSelectMode?: (mode: "clicker" | "race") => void;
  resultsLabel?: string;
};

function Hud({ mode = "clicker", onSelectMode, resultsLabel }: Props) {
  const { data: globalClicks = 0 } = useGlobalClicks();
  const { races, identities } = useRaceResults();

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

  const resultsLabelComputed = React.useMemo(() => {
    const latest = races && races.length > 0 ? races[0] : null;
    const id = latest?.winner ? identities[latest.winner] : undefined;
    if (resultsLabel !== undefined) return resultsLabel;
    if (!latest) return "Results";
    return `Winner: ${
      id?.name || `${latest.winner.slice(0, 6)}…${latest.winner.slice(-4)}`
    }`;
  }, [races, identities, resultsLabel]);

  return (
    <div
      className="inline-hud select-none text-sm align-middle items-center"
      role="group"
      aria-label="Heads-up display"
    >
      <span className="opacity-70">Global:</span>
      <span
        className={`metric-value`}
        aria-label={`Global clicks: ${formatted}`}
      >
        {formatted}
      </span>

      <span
        className="metric-emoji"
        title={`Palier ${rangeStart}–${rangeEnd}`}
        aria-label={`Milestone ${rangeStart} to ${rangeEnd}`}
      >
        {emoji}
      </span>
      <div
        className="seg-toggle"
        style={{ marginLeft: 10 }}
        role="group"
        aria-label="Mode"
      >
        {onSelectMode ? (
          <>
            <button
              className={mode === "clicker" ? "active" : ""}
              onClick={() => onSelectMode && onSelectMode("clicker")}
              title="Clicker"
              aria-pressed={mode === "clicker"}
            >
              Clicker
            </button>
            <button
              className={mode === "race" ? "active" : ""}
              onClick={() => onSelectMode && onSelectMode("race")}
              title="Horse Race"
              aria-pressed={mode === "race"}
            >
              Race
            </button>
          </>
        ) : (
          <>
            <Link
              className={mode === "clicker" ? "active" : ""}
              href="/"
              title="Clicker"
              aria-current={mode === "clicker" ? "page" : undefined}
            >
              Clicker
            </Link>
            <Link
              className={mode === "race" ? "active" : ""}
              href="/results"
              title="Horse Race"
              aria-current={mode === "race" ? "page" : undefined}
            >
              Race
            </Link>
          </>
        )}
      </div>
      {isActive && (
        <Link
          href="/results"
          className="hud-pill"
          style={{ marginLeft: 10 }}
          title="Race results"
          aria-label={`Results: ${resultsLabelComputed}`}
        >
          <span aria-hidden style={{ marginRight: 6 }}>
            🏆
          </span>
          <span className="truncate" style={{ maxWidth: 160 }}>
            {resultsLabelComputed}
          </span>
        </Link>
      )}
    </div>
  );
}

export default React.memo(Hud);
