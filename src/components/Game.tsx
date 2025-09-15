"use client";

import React from "react";
import WalletConnect from "./WalletConnect";
import Hud from "./Hud";
import RiceClicker from "./RiceClicker";
import HorseRace from "./HorseRace";
import LiveActivity from "./LiveActivity";
import { useAccount } from "wagmi";
import { http, createPublicClient, formatEther } from "viem";
import { riseTestnet } from "rise-wallet";
import FundModal from "@/components/FundModal";
import { useToast } from "@/components/Toast";
import { usePresence } from "@/hooks/usePresence";

export default function Game() {
  const { isConnected } = useAccount();
  const [mode, setMode] = React.useState<"clicker" | "race">("clicker");
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const [fundOpen, setFundOpen] = React.useState(false);
  const { show } = useToast();
  const { address } = useAccount();
  const { peers } = usePresence({ address });
  const [embeddedBalance, setEmbeddedBalance] = React.useState<bigint | null>(
    null
  );

  const rpcUrl =
    process.env.NEXT_PUBLIC_RISE_RPC_URL ||
    "https://rise-testnet-porto.fly.dev";
  const publicClient = React.useMemo(
    () =>
      createPublicClient({
        chain: riseTestnet,
        transport: http(rpcUrl),
      }),
    [rpcUrl]
  );

  // Restore persisted mode if valid (only switch to HUD after balance check)
  React.useEffect(() => {
    (async () => {
      try {
        const saved =
          typeof window !== "undefined"
            ? localStorage.getItem("game_mode")
            : null;
        if (saved !== "hud") return;

        const k =
          typeof window !== "undefined"
            ? localStorage.getItem("embedded_privkey")
            : null;
        if (!k) {
          show({
            type: "info",
            title: "Embedded",
            message: "Activez la clé embarquée depuis Wallet",
          });
          setFundOpen(true);
          try {
            localStorage.setItem("game_mode", "clicker");
          } catch {}
          return;
        }
        const pk = k.startsWith("0x")
          ? (k as `0x${string}`)
          : (("0x" + k) as `0x${string}`);
        const { privateKeyToAccount } = await import("viem/accounts");
        const acct = privateKeyToAccount(pk);
        setEmbeddedAddr(acct.address);
        const bal = await publicClient.getBalance({ address: acct.address });
        setEmbeddedBalance(bal);
        if (bal > BigInt(0)) {
          setMode("race");
          try {
            localStorage.setItem("game_mode", "race");
          } catch {}
        } else {
          show({
            type: "error",
            title: "Fonds insuffisants",
            message: "Alimentez l'adresse embarquée pour utiliser le mode Race",
          });
          setFundOpen(true);
          try {
            localStorage.setItem("game_mode", "clicker");
          } catch {}
        }
      } catch {}
    })();
  }, [publicClient, show]);

  // Removed beige-mode background override to keep the same background across modes

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 gap-6 pt-24">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="flex items-center gap-3">
            <Hud />
            {embeddedAddr && embeddedBalance !== null && (
              <span
                className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white/80 border border-black/10 shadow-sm"
                title={`Solde embedded`}
              >
                {(() => {
                  try {
                    const eth = formatEther(embeddedBalance!);
                    const dot = eth.indexOf(".");
                    const s =
                      dot === -1
                        ? eth
                        : `${eth.slice(0, dot)}.${eth.slice(dot + 1, dot + 5)}`;
                    return `${s} ETH`;
                  } catch {
                    return `${embeddedBalance.toString()} wei`;
                  }
                })()}
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("clicker")}
                className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-sm hover:brightness-105 active:brightness-100 ${
                  mode === "clicker"
                    ? "bg-black text-white border-black/10"
                    : "bg-white/80 border-black/10"
                }`}
                title="Clicker"
              >
                Clicker
              </button>
              <button
                onClick={() => setMode("race")}
                className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-sm hover:brightness-105 active:brightness-100 ${
                  mode === "race"
                    ? "bg-black text-white border-black/10"
                    : "bg-white/80 border-black/10"
                }`}
                title="Horse Race"
              >
                Race
              </button>
            </div>
            {isConnected && mode !== "race" && <LiveActivity />}
            <span className="hud-pill text-xs">
              <span className="opacity-70">Connected</span>
              <span className="hud-badge">{peers.length}</span>
            </span>
          </div>
          <span className="topbar-sep" aria-hidden="true" />
          <WalletConnect variant="inline" />
        </div>
      </div>
      {mode === "clicker" && <RiceClicker />}
      {mode === "race" && <HorseRace />}
      <FundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        embeddedAddress={embeddedAddr}
      />
    </div>
  );
}
