"use client";

import React from "react";
import type { LobbyPlayer } from "@/hooks/useRaceLobby";

type Props = {
  players: LobbyPlayer[];
  threshold: number;
  visible: boolean;
  onNewRace: () => void | Promise<void>;
  onNewRaceAndJoin: () => void | Promise<void>;
  onExportPodium: () => void | Promise<void>;
};

export default function Podium({
  players,
  threshold,
  visible,
  onNewRace,
  onNewRaceAndJoin,
  onExportPodium,
}: Props) {
  if (!visible) return null;
  const sorted = [...players].sort((a, b) => b.clicks - a.clicks);
  const top3 = sorted.slice(0, 3);
  return (
    <div className="hud-card p-4 text-slate-900">
      <div className="text-xl font-extrabold mb-3">Podium</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {top3.map((p, i) => {
          const percent = threshold
            ? Math.round(Math.min(100, (p.clicks / threshold) * 100))
            : 0;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
          return (
            <div key={p.address} className="flex flex-col items-center gap-1">
              <div
                className="hud-pill text-sm font-extrabold"
                style={{ background: "rgba(255,255,255,0.95)" }}
              >
                {medal} #{i + 1}
              </div>
              <div
                className="text-lg font-extrabold"
                style={{ color: p.color }}
              >
                {p.name || p.address.slice(0, 6)}
              </div>
              <div className="text-xs opacity-80">
                {p.clicks} / {threshold} ({percent}%)
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={onNewRace} className="rk-btn">
          New race
        </button>
        <button onClick={onNewRaceAndJoin} className="rk-btn primary">
          New race & Join
        </button>
        <button onClick={onExportPodium} className="rk-btn">
          Export podium
        </button>
      </div>
    </div>
  );
}
