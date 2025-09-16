"use client";

import React from "react";
import type { LobbyState } from "@/hooks/useRaceLobby";

export function useConfettiSeed(status: LobbyState["status"] | undefined) {
  const [confettiSeed, setConfettiSeed] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (status === "finished") setConfettiSeed(Date.now());
  }, [status]);
  return confettiSeed;
}

