"use client";

import React from "react";
import type { LobbyPlayer } from "@/hooks/useRaceLobby";

export function useEnsureFocusedLaneVisible(
  containerRef: React.RefObject<HTMLElement | null>,
  players: LobbyPlayer[],
  laneHeight: number,
  focusAddress?: `0x${string}` | string | null
) {
  React.useEffect(() => {
    if (!focusAddress) return;
    const idx = players.findIndex(
      (p) => p.address.toLowerCase() === String(focusAddress).toLowerCase()
    );
    if (idx < 0) return;
    try {
      const el = containerRef.current?.querySelector(
        `[data-lane-index="${idx}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {}
  }, [players, focusAddress, laneHeight, containerRef]);
}

