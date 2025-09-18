"use client";

import React from "react";
import { getSharedRisePublicClient } from "@/lib/embedded";
import { ClickCounterAbi } from "@/abi/ClickCounter";

type LiveEvent = {
  id: string;
  address: `0x${string}`;
  player: `0x${string}`;
  amount: bigint;
  newTotal: bigint;
  ts: number;
};

// Use env var for contract address
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

function isSocketClosedError(err: unknown): boolean {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { name?: unknown; message?: unknown };
    const name = typeof maybe.name === "string" ? maybe.name : "";
    const msg = typeof maybe.message === "string" ? maybe.message : "";
    return (
      name === "SocketClosedError" ||
      msg.toLowerCase().includes("socket has been closed")
    );
  }
  return false;
}

export default function LiveActivity() {
  const [uniqueActive, setUniqueActive] = React.useState<number>(0);
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [compact, setCompact] = React.useState<boolean>(false);
  const wsClientRef = React.useRef<ReturnType<
    typeof getSharedRisePublicClient
  > | null>(null);
  const timers = React.useRef<number[]>([]);
  const lastSeenRef = React.useRef<Map<`0x${string}`, number>>(new Map());
  const seqRef = React.useRef<number>(0);
  const WINDOW_MS = 3000; // time window to consider someone "actively clicking"
  const RETAIN_MS = 2000; // how long to keep items in the visual list

  React.useEffect(() => {
    const client = getSharedRisePublicClient();
    wsClientRef.current = client;

    const unwatch = client.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: ClickCounterAbi,
      eventName: "ClickRecorded",
      onLogs(logs) {
        const now = Date.now();
        setEvents((prev) => {
          const next = [...prev];
          for (const l of logs) {
            const player = (l.args?.player ??
              "0x0000000000000000000000000000000000000000") as `0x${string}`;
            const amount = (l.args?.amount ?? BigInt(0)) as bigint;
            const newTotal = (l.args?.newTotal ?? BigInt(0)) as bigint;
            // mark player as active now
            lastSeenRef.current.set(player, now);
            const uniqueId = `${l.blockHash ?? "shred"}-${
              l.logIndex ?? "x"
            }-${seqRef.current++}-${now}`;
            next.unshift({
              id: uniqueId,
              address: l.address as `0x${string}`,
              player,
              amount,
              newTotal,
              ts: now,
            });
          }
          return next.slice(0, 40);
        });

        // update unique active immediately
        const cutoff = now - WINDOW_MS;
        let count = 0;
        for (const [, ts] of lastSeenRef.current) {
          if (ts >= cutoff) count++;
        }
        setUniqueActive(count);
      },
      onError(error) {
        if (isSocketClosedError(error)) return;
        console.error("LiveActivity watchContractEvent error", error);
      },
    });

    // periodic cleanup and unique count refresh
    const interval = window.setInterval(() => {
      const now2 = Date.now();
      const cutoff2 = now2 - WINDOW_MS;
      let count2 = 0;
      for (const [addr, ts] of lastSeenRef.current) {
        if (ts < cutoff2) lastSeenRef.current.delete(addr);
        else count2++;
      }
      setUniqueActive(count2);
      // Also prune old visual events so placeholder can reappear when quiet
      setEvents((prev) => prev.filter((e) => now2 - e.ts <= RETAIN_MS));
    }, 500);

    return () => {
      try {
        unwatch?.();
      } catch {}
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
      window.clearInterval(interval);
    };
  }, []);

  // Restore compact preference from localStorage
  React.useEffect(() => {
    try {
      const v =
        typeof window !== "undefined"
          ? localStorage.getItem("live_activity_compact")
          : null;
      if (v != null) setCompact(v === "1");
    } catch {}
  }, []);

  const toggleCompact = React.useCallback(() => {
    setCompact((c) => {
      const next = !c;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("live_activity_compact", next ? "1" : "0");
        }
      } catch {}
      return next;
    });
  }, []);

  return (
    <div className="live-activity" aria-live="polite">
      <div className="row">
        <div className="live-badge" title="Active users (3s)">
          <span className="dot" />{" "}
          {uniqueActive > 1
            ? `${uniqueActive} actives`
            : `${uniqueActive} active`}
        </div>
        <button
          className="toggle"
          onClick={toggleCompact}
          aria-pressed={compact}
          aria-label={compact ? "Show all activity" : "Compact activity"}
          title={compact ? "Show all" : "Compact"}
        >
          {compact ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </button>
      </div>
      {!compact && (
        <div className="live-list mask-fade" role="log">
          {events.slice(0, 5).map((e) => {
            const seed = parseInt(e.player.slice(2, 8), 16);
            const hue = seed % 360;
            const style: React.CSSProperties & {
              ["--tint-bg"]?: string;
              ["--tint-strong"]?: string;
            } = {
              ["--tint-bg"]: `hsla(${hue}, 90%, 60%, 0.18)`,
              ["--tint-strong"]: `hsl(${hue}, 82%, 56%)`,
            };
            return (
              <div key={e.id} className="live-item" style={style}>
                <span className="addr">
                  {e.player.slice(0, 6)}…{e.player.slice(-4)}
                </span>
                <span className="amt">+{e.amount.toString()}</span>
                <span className="total">→ {e.newTotal.toString()}</span>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="live-empty">No activity yet</div>
          )}
        </div>
      )}
      {compact && (
        <div className="live-list single" role="log">
          {events.slice(0, 1).map((e) => {
            const seed = parseInt(e.player.slice(2, 8), 16);
            const hue = seed % 360;
            const style: React.CSSProperties & {
              ["--tint-bg"]?: string;
              ["--tint-strong"]?: string;
            } = {
              ["--tint-bg"]: `hsla(${hue}, 90%, 60%, 0.18)`,
              ["--tint-strong"]: `hsl(${hue}, 82%, 56%)`,
            };
            return (
              <div key={e.id} className="live-item" style={style}>
                <span className="addr">
                  {e.player.slice(0, 6)}…{e.player.slice(-4)}
                </span>
                <span className="amt">+{e.amount.toString()}</span>
                <span className="total">→ {e.newTotal.toString()}</span>
              </div>
            );
          })}
          {events.length === 0 && (
            <div className="live-empty">No activity yet</div>
          )}
        </div>
      )}
      <style jsx>{`
        .live-activity {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 84px);
          left: calc(env(safe-area-inset-left, 0px) + 16px);
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          z-index: 45;
        }
        .row {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.74);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
        }
        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
          font-weight: 600;
        }
        .toggle {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          color: #0f172a;
          border: 1px solid rgba(15, 23, 42, 0.12);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
          line-height: 1;
          transition: transform 120ms ease, background 120ms ease,
            box-shadow 120ms ease;
        }
        .toggle svg {
          width: 16px;
          height: 16px;
        }
        .toggle:hover {
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
          transform: translateY(-1px) scale(1.03);
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #16a34a;
          box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.15);
        }
        .live-list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: min(280px, 36vw);
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 260px; /* ~10 rows */
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.15);
          z-index: 35;
        }
        .live-list.single {
          max-height: none;
        }
        .mask-fade {
          -webkit-mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 1) 14px,
            rgba(0, 0, 0, 1) calc(100% - 24px),
            rgba(0, 0, 0, 0)
          );
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 1) 14px,
            rgba(0, 0, 0, 1) calc(100% - 24px),
            rgba(0, 0, 0, 0)
          );
        }
        .live-item {
          display: flex;
          gap: 8px;
          justify-content: space-between;
          font-size: 12px;
          background: linear-gradient(
            90deg,
            var(--tint-bg, rgba(255, 255, 255, 0.58)) 0%,
            rgba(255, 255, 255, 0.8) 100%
          );
          color: #111;
          padding: 4px 8px;
          border-radius: 8px;
          backdrop-filter: blur(6px);
          border-left: 4px solid var(--tint-strong, rgba(0, 0, 0, 0.2));
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.28) inset,
            0 0 0 1px rgba(0, 0, 0, 0.07);
          transition: background 120ms ease, box-shadow 120ms ease;
        }
        .live-item:hover {
          background: linear-gradient(
            90deg,
            var(--tint-bg, rgba(255, 255, 255, 0.64)) 0%,
            rgba(255, 255, 255, 0.88) 100%
          );
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.32) inset,
            0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        .addr {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          opacity: 0.9;
          min-width: 0;
        }
        .amt {
          color: var(--tint-strong, #0ea5e9);
          font-weight: 700;
        }
        .total {
          color: #4b5563;
        }
        .live-empty {
          font-size: 12px;
          color: #6b7280;
        }
        @media (max-width: 640px) {
          .live-activity {
            top: calc(env(safe-area-inset-top, 0px) + 96px);
            left: calc(env(safe-area-inset-left, 0px) + 10px);
          }
          .row {
            gap: 6px;
          }
          .live-badge {
            padding: 4px 8px;
          }
          .live-list {
            width: min(80vw, 260px);
            max-height: 44vh;
          }
          .live-item {
            font-size: 11px;
            padding: 4px 6px;
          }
        }

        @media (max-width: 420px) {
          .live-activity {
            top: calc(env(safe-area-inset-top, 0px) + 88px);
            left: calc(env(safe-area-inset-left, 0px) + 8px);
          }
          .live-list {
            width: 88vw;
            max-height: 46vh;
          }
          .live-item {
            font-size: 10px;
            gap: 6px;
          }
        }

        @media (max-height: 700px) and (orientation: landscape) {
          .live-activity {
            top: auto;
            bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
            left: calc(env(safe-area-inset-left, 0px) + 12px);
          }
          .live-list {
            top: auto;
            bottom: calc(100% + 6px);
            max-height: 36vh;
          }
        }
      `}</style>
    </div>
  );
}
