"use client";

import React from "react";
import WalletConnect from "./WalletConnect";
import Hud from "./Hud";
import LiveActivity from "./LiveActivity";
import { type GameMode } from "@/lib/gameMode";

type NavbarProps = {
  mode: GameMode;
  onSelectMode?: (mode: GameMode) => void;
  peersCount?: number;
  showPeersPill?: boolean;
};

export default function Navbar({ mode, onSelectMode }: NavbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="flex items-center gap-3">
          <Hud mode={mode} onSelectMode={onSelectMode} />
          <div className="flex items-center gap-2" />
          {mode !== "race" && <LiveActivity />}
          <WalletConnect variant="inline" />
        </div>
      </div>
    </div>
  );
}
