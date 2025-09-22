"use client";

import React from "react";
import Navbar from "./Navbar";
import RiceClicker from "./RiceClicker";
import HorseRace from "./HorseRace";
import { createRisePublicClient, loadEmbeddedInfo } from "@/lib/embedded";
import {
  getModeFromUrl,
  loadStoredMode,
  persistMode,
  type GameMode,
} from "@/lib/gameMode";
import FundModal from "@/components/FundModal";

// using shared helpers from lib

export default function Game() {
  const [mode, setMode] = React.useState<GameMode>("clicker");
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const [fundOpen, setFundOpen] = React.useState(false);
  const [embeddedBalance, setEmbeddedBalance] = React.useState<bigint | null>(
    null
  );

  const publicClient = React.useMemo(() => createRisePublicClient(), []);

  // Load embedded account/balance if available
  const loadEmbedded = React.useCallback(async () => {
    const info = await loadEmbeddedInfo(publicClient);
    setEmbeddedAddr(info.address);
    setEmbeddedBalance(info.balance);
    return { addr: info.address, bal: info.balance };
  }, [publicClient]);

  // (old ensureRaceEligible removed; soft prompt is handled below)

  // Initialize mode from URL or storage once
  React.useEffect(() => {
    const fromUrl = typeof window !== "undefined" ? getModeFromUrl() : null;
    if (fromUrl) {
      setMode(fromUrl);
      persistMode(fromUrl);
      return;
    }
    const stored = loadStoredMode();
    if (stored) setMode(stored);
  }, []);

  // Validate when entering race mode; otherwise keep requested mode
  React.useEffect(() => {
    (async () => {
      if (mode === "race") {
        // Soft prompt for embedded key/balance but do not block the view
        const { addr, bal } = await loadEmbedded();
        if (!addr || !bal || bal <= BigInt(0)) {
          // keep race UI, but prompt funding
          setFundOpen(true);
        }
        persistMode("race");
      } else {
        persistMode("clicker");
      }
    })();
  }, [mode, loadEmbedded]);

  // Removed beige-mode background override to keep the same background across modes

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 gap-6 pt-24">
      <Navbar mode={mode} onSelectMode={setMode} />
      {mode === "clicker" && <RiceClicker />}
      {mode === "race" && (
        <>
          {(!embeddedAddr ||
            !embeddedBalance ||
            embeddedBalance <= BigInt(0)) && (
            <div className="hud-card p-3 w-full max-w-5xl mx-auto text-sm flex flex-wrap items-center gap-3">
              <span className="font-medium">Race mode limited</span>
              <span className="opacity-70">
                Enable the embedded key and fund it to click on-chain.
              </span>
              <button className="btn" onClick={() => setFundOpen(true)}>
                Open Wallet
              </button>
              {process.env.NEXT_PUBLIC_RISE_FAUCET_URL && (
                <a
                  className="btn"
                  href={process.env.NEXT_PUBLIC_RISE_FAUCET_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Faucet
                </a>
              )}
            </div>
          )}
          <HorseRace />
        </>
      )}
      <FundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        embeddedAddress={embeddedAddr}
      />
    </div>
  );
}
