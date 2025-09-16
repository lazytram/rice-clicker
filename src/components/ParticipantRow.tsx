"use client";

import React from "react";
import type { Identity } from "@/hooks/useRaceResults";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type Props = {
  address: `0x${string}`;
  total: bigint;
  identity?: Identity;
  max: bigint;
};

export default function ParticipantRow({
  address,
  total,
  identity,
  max,
}: Props) {
  const percent = max > 0n ? Number((total * 100n) / max) : 0;
  return (
    <div className="flex flex-col gap-1 rounded border border-slate-200 px-2 py-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: identity?.color || "#888888" }}
            aria-hidden
          />
          <div className="truncate">
            <span className="font-medium">
              {identity?.name || shortAddr(address)}
            </span>
            <span className="ml-2 text-xs text-slate-400">
              {shortAddr(address)}
            </span>
          </div>
        </div>
        <div className="text-xs tabular-nums text-slate-600">
          {total.toString()} clicks
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded">
        <div
          className="h-1.5 bg-sky-500 rounded"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
