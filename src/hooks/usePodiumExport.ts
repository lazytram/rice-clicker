"use client";

import React from "react";
import type { LobbyPlayer } from "@/hooks/useRaceLobby";

export function usePodiumExport(
  players: LobbyPlayer[],
  threshold: number,
  lobbyId?: string | null
) {
  return React.useCallback(() => {
    const escapeCSV = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const sorted = [...(players || [])].sort((a, b) => b.clicks - a.clicks);
    const top3 = sorted.slice(0, 3);
    const header = [
      "rank",
      "name",
      "address",
      "clicks",
      "threshold",
      "percent",
    ].join(",");
    const rows = top3.map((p, i) => {
      const nameSafe = escapeCSV(p.name || p.address.slice(0, 6));
      const percent = threshold
        ? Math.round(Math.min(100, (p.clicks / threshold) * 100))
        : 0;
      return [i + 1, nameSafe, p.address, p.clicks, threshold, percent].join(
        ","
      );
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `podium-${lobbyId || "race"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, [players, threshold, lobbyId]);
}

