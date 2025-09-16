"use client";

import React from "react";
import WalletConnect from "./WalletConnect";
import Hud from "./Hud";
import LiveActivity from "./LiveActivity";
import { useAccount } from "wagmi";
import { type GameMode } from "@/lib/gameMode";

type NavbarProps = {
  mode: GameMode;
  onSelectMode?: (mode: GameMode) => void;
  peersCount?: number;
  showPeersPill?: boolean;
};

export default function Navbar({
  mode,
  onSelectMode,
  peersCount = 0,
  showPeersPill = true,
}: NavbarProps) {
  const { isConnected } = useAccount();

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="flex items-center gap-3">
          <Hud mode={mode} onSelectMode={onSelectMode} />
          <div className="flex items-center gap-2" />
          {isConnected && mode !== "race" && <LiveActivity />}
          <span
            className="hud-pill text-xs"
            style={showPeersPill ? undefined : { visibility: "hidden" }}
            aria-hidden={showPeersPill ? undefined : true}
          >
            <span className="opacity-70">Connected</span>
            <span className="hud-badge">{peersCount}</span>
          </span>
        </div>
        <span className="topbar-sep" aria-hidden="true" />
        <WalletConnect variant="inline" />
      </div>
    </div>
  );
}
