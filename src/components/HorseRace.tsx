"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import FundModal from "@/components/FundModal";
import { useToast } from "@/components/Toast";
import {
  encodeFunctionData,
  http,
  createWalletClient,
  createPublicClient,
} from "viem";
import { riseTestnet } from "rise-wallet";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicShredClient, sendRawTransactionSync } from "shreds/viem";
import { ClickCounterAbi } from "@/abi/ClickCounter";
import { formatFriendlyError, isInsufficientFunds } from "@/lib/errors";
import HorseSprite from "@/components/HorseSprite";
import { useRaceLobby } from "@/hooks/useRaceLobby";
import RaceActivity from "@/components/RaceActivity";
import { DEFAULT_RACE_THRESHOLD } from "@/lib/constants";

export default function HorseRace() {
  const { address } = useAccount();
  const [lobbyId, setLobbyId] = React.useState<string | null>(null);
  const { lobby, create, joinAny, join, leave, advance } = useRaceLobby(
    lobbyId || undefined
  );
  // Responsive sizing for the race track
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const [scale, setScale] = React.useState<number>(1);
  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = (w: number) => {
      setContainerWidth(w);
      // Baseline width ~900px → downscale on smaller screens, clamp between 0.6 and 1
      const s = Math.min(1, Math.max(0.4, w / 900));
      setScale(s);
    };
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect?.width) update(rect.width);
    });
    ro.observe(el);
    // Initial measure
    update(el.getBoundingClientRect().width || 0);
    return () => ro.disconnect();
  }, []);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#ff5a5f");
  const [capacity, setCapacity] = React.useState(5);
  const [joinLobbyIdInput, setJoinLobbyIdInput] = React.useState("");
  const [flow, setFlow] = React.useState<"create" | "join">("create");
  const [fundOpen, setFundOpen] = React.useState(false);
  const { show } = useToast();

  // Presence handled globally in Game topbar

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

  // No direct on-chain event building for the player list now; lobby API owns it

  const embeddedNextNonceRef = React.useRef<bigint | null>(null);
  const embeddedNonceChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const getNextEmbeddedNonce = React.useCallback(
    async (addr: `0x${string}`) => {
      const assign = async () => {
        if (embeddedNextNonceRef.current === null) {
          const remote = await publicClient.getTransactionCount({
            address: addr,
            blockTag: "pending",
          });
          embeddedNextNonceRef.current = BigInt(remote);
        }
        const current = embeddedNextNonceRef.current!;
        embeddedNextNonceRef.current = current + BigInt(1);
        return current;
      };
      const p = embeddedNonceChainRef.current.then(assign, assign);
      embeddedNonceChainRef.current = p.then(
        () => undefined,
        () => undefined
      );
      return p;
    },
    [publicClient]
  );

  const meIn = React.useMemo(() => {
    if (!address || !lobby) return undefined;
    return lobby.players.find(
      (p) => p.address.toLowerCase() === address.toLowerCase()
    );
  }, [lobby, address]);

  const status = lobby?.status;

  // Confetti trigger when race finishes
  const [confettiSeed, setConfettiSeed] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (status === "finished") setConfettiSeed(Date.now());
  }, [status]);

  const onCreateRace = async () => {
    if (!address) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before creating a race.",
      });
      return;
    }
    const next = await create({
      capacity: Math.max(2, Math.min(10, capacity || 5)),
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinAnyRace = async () => {
    if (!address) return;
    const next = await joinAny({
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinById = async () => {
    if (!address || !joinLobbyIdInput) return;
    await join({
      lobbyId: joinLobbyIdInput,
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(joinLobbyIdInput);
  };

  const onJoin = async () => {
    if (!address || !lobbyId) return;
    await join({
      lobbyId,
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
  };
  const onLeave = async () => {
    if (!address || !lobbyId) return;
    await leave({ lobbyId, address });
    setLobbyId(null);
    setJoinLobbyIdInput("");
  };
  // start removed per UI simplification
  const onClickAdvance = async () => {
    if (!address || !lobbyId) return;
    // Optimistic update: make the horse move immediately
    try {
      // fire-and-forget; UI poll will reflect quickly
      void advance({ lobbyId, address, amount: 1 });
    } catch {}
    // Then, send on-chain click using embedded key like the Clicker
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) {
        show({
          type: "info",
          title: "Embedded required",
          message: "Enable the embedded key from the Wallet menu",
        });
        setFundOpen(true);
        return;
      }
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const account = privateKeyToAccount(pk);
      const client = createWalletClient({
        account,
        chain: riseTestnet,
        transport: http(rpcUrl),
      });
      const contractAddress = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;
      const nonce = await getNextEmbeddedNonce(account.address);
      const data = encodeFunctionData({
        abi: ClickCounterAbi,
        functionName: "click",
        args: [],
      });
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: contractAddress,
        data,
      });
      const gas = (gasEstimated * BigInt(105)) / BigInt(100);
      let serialized: `0x${string}`;
      try {
        const block = await publicClient.getBlock({ blockTag: "pending" });
        if (block.baseFeePerGas != null) {
          const tip = BigInt(1);
          const maxFeePerGas = block.baseFeePerGas + tip;
          serialized = await client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            maxFeePerGas,
            maxPriorityFeePerGas: tip,
          });
        } else {
          const gasPrice = BigInt(1);
          serialized = await client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice,
          });
        }
      } catch {
        const gasPrice = BigInt(1);
        serialized = await client.signTransaction({
          chain: riseTestnet,
          account,
          to: contractAddress,
          data,
          nonce: Number(nonce),
          gas,
          gasPrice,
        });
      }
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: http(rpcUrl),
      });
      await sendRawTransactionSync(shredClient, {
        serializedTransaction: serialized,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e);
      if (msg.includes("nonce")) embeddedNextNonceRef.current = null;
      if (isInsufficientFunds(e)) {
        setFundOpen(true);
      }
      const toast = formatFriendlyError(e, "tx");
      show(toast);
      return;
    }
  };

  const onNewRace = async () => {
    try {
      if (!address) return;
      const next = await create({
        capacity: Math.max(2, Math.min(10, lobby?.capacity || 5)),
        address,
        name: name || `Player ${address.slice(2, 6)}`,
        color,
      });
      setLobbyId(next.id);
    } catch {}
  };

  const onNewRaceAndJoin = onNewRace;

  const onExportPodium = React.useCallback(() => {
    if (!lobby) return;
    const escapeCSV = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const sorted = [...(lobby.players || [])].sort(
      (a, b) => b.clicks - a.clicks
    );
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
      const percent = lobby.threshold
        ? Math.round(Math.min(100, (p.clicks / lobby.threshold) * 100))
        : 0;
      return [
        i + 1,
        nameSafe,
        p.address,
        p.clicks,
        lobby.threshold,
        percent,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `podium-${lobby.id || "race"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, [lobby]);

  // Progress mapping to track length; threshold is finish line
  const BASE_TRACK_LEN = 720; // desktop baseline
  const threshold = lobby?.threshold ?? DEFAULT_RACE_THRESHOLD;
  const marks = React.useMemo(() => {
    if (!threshold || threshold <= 0) return [] as number[];
    const step = 50;
    const count = Math.floor(threshold / step);
    return Array.from({ length: count }, (_, i) => step * (i + 1)).filter(
      (m) => m < threshold
    );
  }, [threshold]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 items-stretch">
      {/* Lobby controls */}
      <div className="hud-card p-4">
        <div
          className={`flex flex-wrap items-center gap-3 text-slate-900${
            !lobbyId ? " relative has-right-toggle" : ""
          }`}
        >
          <div className="hud-pill">
            <input
              className="px-2 py-1 rounded-md bg-white/90 outline-none placeholder:text-slate-500 text-slate-900"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!meIn || (lobby && lobby.status !== "waiting")}
            />
          </div>
          <div className="hud-pill">
            <input
              type="color"
              className="w-8 h-8 rounded-md border border-black/10"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={!!meIn || (lobby && lobby.status !== "waiting")}
              title="Saddle color"
            />
          </div>
          {/* Create / Join controls */}
          {!lobbyId ? (
            <>
              {flow === "create" ? (
                <>
                  <div className="hud-pill text-sm">
                    <span className="opacity-70">Capacity</span>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(
                          Math.max(2, Math.min(10, Number(e.target.value) || 2))
                        )
                      }
                      className="w-14 bg-transparent outline-none text-slate-900"
                      title="Players per race"
                    />
                  </div>
                  <button
                    onClick={onCreateRace}
                    className="rk-btn primary"
                    disabled={!name.trim()}
                    title={!name.trim() ? "Enter your name first" : undefined}
                  >
                    Create race
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onJoinAnyRace} className="rk-btn primary">
                    Join any
                  </button>
                  <div className="hud-pill">
                    <input
                      className="px-2 py-1 rounded-md bg-white/90 outline-none placeholder:text-slate-500 text-slate-900"
                      placeholder="Enter lobby id"
                      value={joinLobbyIdInput}
                      onChange={(e) => setJoinLobbyIdInput(e.target.value)}
                    />
                  </div>
                  <button onClick={onJoinById} className="rk-btn">
                    Join by ID
                  </button>
                </>
              )}
              {/* Mode toggle pinned to the far right */}
              <div className="seg-toggle fixed-right">
                <button
                  className={flow === "create" ? "active" : ""}
                  onClick={() => setFlow("create")}
                >
                  Create
                </button>
                <button
                  className={flow === "join" ? "active" : ""}
                  onClick={() => setFlow("join")}
                >
                  Join
                </button>
              </div>
            </>
          ) : (
            <div className="hud-pill text-sm">
              <span className="opacity-70">Lobby ID</span>
              <span className="hud-badge" style={{ userSelect: "text" }}>
                {lobbyId}
              </span>
              <button
                className="rk-btn"
                onClick={() => navigator.clipboard.writeText(lobbyId)}
              >
                Copy
              </button>
            </div>
          )}
          {lobbyId &&
            (!meIn ? (
              <button
                onClick={onJoin}
                disabled={!address || !lobby || lobby.status !== "waiting"}
                className="rk-btn primary disabled:opacity-50"
              >
                Join
              </button>
            ) : (
              <button
                onClick={onLeave}
                disabled={!lobby || lobby.status !== "waiting"}
                className="rk-btn"
                style={{
                  background: "#fecaca",
                  border: "1px solid rgba(0,0,0,0.06)",
                  color: "#7f1d1d",
                  fontWeight: 800,
                }}
              >
                Leave
              </button>
            ))}
          <div className="grow" />
          {!!lobby && (
            <>
              <div className="hud-pill text-sm">
                <span className="opacity-70">Players</span>
                <span className="hud-badge">{lobby.players.length}</span>
              </div>
              <div className="hud-pill text-sm">
                <span className="opacity-70">Capacity</span>
                <span className="hud-badge">{lobby.capacity}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Countdown banner */}
      {status === "countdown" && (
        <div className="text-center text-2xl font-extrabold hud-pill mx-auto">
          3..2..1..Go!
        </div>
      )}

      {/* Track */}
      <div className="hud-card p-0 text-slate-900">
        {(() => {
          const players = lobby?.players || [];
          // Scaled geometry
          const laneHeight = Math.max(56, Math.round(120 * scale)); // px
          const padY = Math.round(24 * scale);
          const startLineLeft = Math.round(90 * scale); // px from left
          const horseNoseOffset = Math.round(86 * scale); // px from sprite left to nose
          const baseOffset = startLineLeft - horseNoseOffset; // align nose on start
          const horseSize = Math.max(56, Math.round(104 * scale));
          const shadowWidth = Math.round(84 * scale);
          const shadowHeight = Math.round(16 * scale);
          const shadowTranslateY = Math.max(
            14,
            Math.round(horseSize - 10 * scale)
          );
          // Track length fits within container width when known; fallback to scaled baseline
          const innerPadRight = Math.round(12 * scale);
          const trackLenPx = containerWidth
            ? Math.max(
                Math.round(260 * scale),
                Math.min(
                  Math.round(BASE_TRACK_LEN * scale),
                  Math.max(
                    120,
                    Math.round(containerWidth - startLineLeft - innerPadRight)
                  )
                )
              )
            : Math.round(BASE_TRACK_LEN * scale);
          const markLeftPx = (meters: number) =>
            startLineLeft +
            Math.floor(((meters || 0) / (threshold || 1)) * trackLenPx);
          return (
            <div
              className="race-track"
              style={{
                height:
                  players.length > 0
                    ? padY * 2 + laneHeight * players.length
                    : 160,
              }}
              ref={trackRef}
            >
              {/* Barrières blanches haut/bas */}
              <div className="race-barrier" style={{ top: padY - 6 }} />
              <div className="race-barrier" style={{ bottom: padY - 6 }} />

              {/* Distance marks */}
              {threshold > 0 && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none font-bold text-gray-700"
                  style={{ fontSize: Math.max(9, Math.round(12 * scale)) }}
                >
                  {/* 0m just after the start line */}
                  <div
                    className="absolute top-2 bg-white/90 px-1 rounded"
                    style={{ left: startLineLeft + 6 }}
                  >
                    0m
                  </div>
                  {marks.map((m) => (
                    <div
                      key={m}
                      className="absolute inset-y-0"
                      style={{ left: markLeftPx(m) }}
                    >
                      <div className="absolute inset-y-0 border-l border-dashed border-white/70" />
                      <div
                        className="absolute top-2 bg-white/90 px-1 rounded"
                        style={{ left: 4 }}
                      >
                        {m}m
                      </div>
                    </div>
                  ))}
                  {/* Finish label */}
                  <div
                    className="absolute top-2 bg-white/90 px-1 rounded"
                    style={{ left: startLineLeft + trackLenPx + 6 }}
                  >
                    Finish
                  </div>
                </div>
              )}

              {/* Lanes + horses */}
              <div className="absolute inset-0" style={{ left: 0, right: 0 }}>
                {/* Start line */}
                <div
                  className="absolute inset-y-0"
                  aria-hidden
                  style={{
                    left: startLineLeft,
                    width: 2,
                    background: "#111827",
                  }}
                />
                {/* Finish line aligned with distance scale */}
                {threshold > 0 && (
                  <div
                    className="absolute top-0 bottom-0"
                    aria-hidden
                    style={{
                      left: startLineLeft + trackLenPx,
                      width: 2,
                      background: "#111827",
                    }}
                  />
                )}
                {players.map((p, i) => {
                  const top = padY + i * laneHeight;
                  const ratio = threshold > 0 ? p.clicks / threshold : 0;
                  const progress =
                    threshold > 0 ? Math.floor(ratio * trackLenPx) : 0;
                  return (
                    <div
                      key={p.address}
                      className="absolute left-0 right-0"
                      style={{ top, height: laneHeight }}
                    >
                      {/* lane separator */}
                      {i > 0 && (
                        <div className="race-lane-sep" style={{ top: -2 }} />
                      )}
                      {/* dashed midline across lane */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed"
                        style={{
                          top: laneHeight / 2,
                          borderColor: "rgba(255,255,255,0.75)",
                        }}
                      />
                      <motion.div
                        className="absolute bottom-1 left-2 flex flex-col items-center"
                        animate={{ x: progress + baseOffset }}
                        transition={{
                          type: "spring",
                          stiffness: 120,
                          damping: 18,
                        }}
                      >
                        <div
                          className="pointer-events-none"
                          style={{
                            width: shadowWidth,
                            height: shadowHeight,
                            borderRadius: 9999,
                            background:
                              "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0, rgba(0,0,0,0.0) 70%)",
                            filter: "blur(1px)",
                            transform: `translateY(${shadowTranslateY}px)`,
                          }}
                        />
                        <HorseSprite color={p.color} size={horseSize} />
                      </motion.div>
                      {/* progress pill removed per request */}
                    </div>
                  );
                })}
                {players.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="hud-pill text-base font-extrabold bg-white/95 shadow-lg"
                      style={{ padding: "10px 14px" }}
                    >
                      🏇 No players yet — click <b className="mx-1">Join</b>{" "}
                      above to start!
                    </div>
                  </div>
                )}

                {/* Finish overlay */}
                {status === "finished" && (
                  <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
                    <div
                      className="pointer-events-auto text-center"
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        background:
                          "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.9), rgba(255,255,255,0.65) 60%)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        boxShadow:
                          "0 18px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
                      }}
                    >
                      {(() => {
                        const sorted = [...players].sort(
                          (a, b) => b.clicks - a.clicks
                        );
                        const top = sorted[0];
                        const percent =
                          threshold > 0
                            ? Math.round(((top?.clicks || 0) / threshold) * 100)
                            : 0;
                        return (
                          <div className="flex flex-col items-center gap-2">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 160,
                                damping: 14,
                              }}
                              className="text-2xl sm:text-3xl font-extrabold"
                              style={{ color: top?.color || "#0f172a" }}
                            >
                              🏁 Winner:{" "}
                              {top?.name || top?.address?.slice(0, 6)}
                            </motion.div>
                            <div className="text-slate-700 text-sm">
                              {top?.clicks ?? 0} / {threshold} ({percent}%)
                            </div>
                            <div
                              className="flex items-center gap-2"
                              style={{ marginTop: 6 }}
                            >
                              <button
                                onClick={onNewRace}
                                className="rk-btn text-sm"
                              >
                                New race
                              </button>
                              <button
                                onClick={onNewRaceAndJoin}
                                className="rk-btn primary text-sm"
                              >
                                New race & Join
                              </button>
                              <button
                                onClick={onExportPodium}
                                className="rk-btn text-sm"
                              >
                                Export podium
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* lightweight confetti */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {confettiSeed &&
                        Array.from({ length: 60 }).map((_, i) => {
                          const rnd = (t: number) =>
                            Math.sin(confettiSeed! * (i + 1) * (t + 1)) * 0.5 +
                            0.5;
                          const left = Math.round(rnd(0.11) * 100);
                          const delay = rnd(0.27) * 0.6;
                          const dur = 2.4 + rnd(0.59) * 1.2;
                          const size = 6 + Math.round(rnd(0.83) * 8);
                          const colors = [
                            "#ef4444",
                            "#f59e0b",
                            "#10b981",
                            "#3b82f6",
                            "#8b5cf6",
                            "#ec4899",
                          ] as const;
                          const color = colors[i % colors.length];
                          const rot = Math.round(rnd(0.37) * 360);
                          return (
                            <span
                              key={i}
                              className="confetti-piece"
                              style={{
                                left: `${left}%`,
                                top: -20,
                                width: size,
                                height: size + 4,
                                background: color,
                                animationDelay: `${delay}s`,
                                animationDuration: `${dur}s`,
                                transform: `rotate(${rot}deg)`,
                              }}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* My click button */}
        <div className="p-4 flex items-center justify-center">
          <button
            onClick={onClickAdvance}
            disabled={status !== "running" || !meIn}
            className="rk-btn primary text-lg disabled:opacity-50"
          >
            Click to run!
          </button>
        </div>
      </div>

      {/* Podium */}
      {lobby?.status === "finished" && (
        <div className="hud-card p-4 text-slate-900">
          <div className="text-xl font-extrabold mb-3">Podium</div>
          {(() => {
            const sorted = [...(lobby?.players || [])].sort(
              (a, b) => b.clicks - a.clicks
            );
            const top3 = sorted.slice(0, 3);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {top3.map((p, i) => {
                  const percent = lobby?.threshold
                    ? Math.round(
                        Math.min(100, (p.clicks / lobby.threshold) * 100)
                      )
                    : 0;
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                  return (
                    <div
                      key={p.address}
                      className="flex flex-col items-center gap-1"
                    >
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
                        {p.clicks} / {lobby?.threshold} ({percent}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
      )}

      {!!(lobby?.players?.length || 0) && (
        <RaceActivity
          items={(lobby?.players || []).map((p) => ({
            address: p.address,
            name: p.name,
            color: p.color,
            clicks: p.clicks,
            threshold: lobby?.threshold || 0,
          }))}
        />
      )}

      <FundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        embeddedAddress={null}
      />
    </div>
  );
}
