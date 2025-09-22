"use client";

import React from "react";
import { motion } from "framer-motion";
import HorseSprite from "@/components/HorseSprite";
import type { LobbyPlayer, LobbyState } from "@/hooks/useRaceLobby";
import { useRaceTrackLayout } from "@/hooks/useRaceTrackLayout";
import { useEnsureFocusedLaneVisible } from "@/hooks/useEnsureFocusedLaneVisible";
import { useConfettiSeed } from "@/hooks/useConfettiSeed";

type Props = {
  players: LobbyPlayer[];
  status: LobbyState["status"] | undefined;
  threshold: number;
  onNewRace: () => void | Promise<void>;
  onNewRaceAndJoin: () => void | Promise<void>;
  onExportPodium: () => void | Promise<void>;
  focusAddress?: `0x${string}` | string | null;
  onClickAnywhere?: () => void | Promise<void>;
};

export default function RaceTrack({
  players,
  status,
  threshold,
  onNewRace,
  onNewRaceAndJoin,
  onExportPodium,
  focusAddress,
  onClickAnywhere,
}: Props) {
  const {
    scale,
    laneHeight,
    padY,
    startLineLeft,
    baseOffset,
    horseSize,
    shadowWidth,
    shadowHeight,
    shadowTranslateY,
    trackLenPx,
    markLeftPx,
    containerRef,
  } = useRaceTrackLayout(threshold, players.length);

  useEnsureFocusedLaneVisible(containerRef, players, laneHeight, focusAddress);

  const confettiSeed = useConfettiSeed(status);

  const marks = React.useMemo(() => {
    if (!threshold || threshold <= 0) return [] as number[];
    // Wider columns: fewer vertical marks across the track
    const step = Math.max(50, Math.round(threshold / 15));
    const list: number[] = [];
    for (let m = step; m < threshold; m += step) list.push(m);
    return list;
  }, [threshold]);

  return (
    <div
      className="race-track"
      style={{
        height:
          players.length > 0 ? padY * 2 + laneHeight * players.length : 160,
      }}
      ref={containerRef as React.RefObject<HTMLDivElement | null>}
      onClick={() => {
        if (status === "running" && onClickAnywhere) onClickAnywhere();
      }}
    >
      <div className="race-barrier" style={{ top: padY - 6 }} />
      <div className="race-barrier" style={{ bottom: padY - 6 }} />

      {threshold > 0 && (
        <div
          className="absolute inset-0 z-10 pointer-events-none font-bold text-gray-700"
          style={{ fontSize: Math.max(9, Math.round(12 * scale)) }}
        >
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
          <div
            className="absolute top-2 bg-white/90 px-1 rounded"
            style={{ left: startLineLeft + trackLenPx - 22 }}
          >
            Finish
          </div>
        </div>
      )}

      <div className="absolute inset-0" style={{ left: 0, right: 0 }}>
        <div
          className="absolute inset-y-0"
          aria-hidden
          style={{ left: startLineLeft, width: 2, background: "#111827" }}
        />
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
          // Allow subpixel progress for smoother movement; clamp to [0, trackLenPx]
          const progress = threshold > 0 ? Math.max(0, Math.min(trackLenPx, ratio * trackLenPx)) : 0;
          return (
            <div
              key={p.address}
              className="absolute left-0 right-0"
              style={{ top, height: laneHeight }}
              data-lane-index={i}
            >
              {i > 0 && <div className="race-lane-sep" style={{ top: -2 }} />}
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
                transition={{ type: "spring", stiffness: 140, damping: 20 }}
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
            </div>
          );
        })}
        {players.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="hud-pill text-base font-extrabold bg-white/95 shadow-lg"
              style={{ padding: "10px 14px" }}
            >
              🏇 No players yet — click <b className="mx-1">Join</b> above to
              start!
            </div>
          </div>
        )}

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
                const sorted = [...players].sort((a, b) => b.clicks - a.clicks);
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
                      🏁 Winner: {top?.name || top?.address?.slice(0, 6)}
                    </motion.div>
                    <div className="text-slate-700 text-sm">
                      {top?.clicks ?? 0} / {threshold} ({percent}%)
                    </div>
                    <div
                      className="flex items-center gap-2"
                      style={{ marginTop: 6 }}
                    >
                      <button onClick={onNewRace} className="rk-btn text-sm">
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
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {confettiSeed &&
                Array.from({ length: 60 }).map((_, i) => {
                  const rnd = (t: number) =>
                    Math.sin(confettiSeed! * (i + 1) * (t + 1)) * 0.5 + 0.5;
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
}
