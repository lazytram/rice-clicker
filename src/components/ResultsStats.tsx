"use client";

import React from "react";
import type { RaceLog, Identity } from "@/hooks/useRaceResults";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type Props = {
  races: RaceLog[] | null;
  identities: Record<string, Identity>;
};

export default function ResultsStats({ races, identities }: Props) {
  const stats = React.useMemo(() => {
    const all = races || [];
    const total = all.length;
    let saved = 0;
    let pending = 0;
    const winsByAddress = new Map<string, number>();
    for (const r of all) {
      if (r.winnerGameUri && r.winnerGameUri.length > 0) saved++;
      if (
        !r.winnerGameUri &&
        r.pendingWinnerGameUri &&
        r.pendingWinnerGameUri.length > 0
      )
        pending++;
      const key = r.winner.toLowerCase();
      winsByAddress.set(key, (winsByAddress.get(key) || 0) + 1);
    }
    const top = Array.from(winsByAddress.entries())
      .map(([address, wins]) => ({ address, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);
    return { total, saved, pending, top };
  }, [races]);

  return (
    <div className="p-4 flex flex-col gap-3 border-b border-slate-200">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div>
          <span className="text-slate-500">Races:</span>{" "}
          <span className="font-medium">{stats.total}</span>
        </div>
        <div>
          <span className="text-slate-500">Saved:</span>{" "}
          <span className="font-medium">{stats.saved}</span>
        </div>
        <div>
          <span className="text-slate-500">Pending:</span>{" "}
          <span className="font-medium">{stats.pending}</span>
        </div>
      </div>
      {stats.top.length > 0 && (
        <div className="text-sm">
          <div className="text-slate-500 mb-1">Top winners</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stats.top.map((t, i) => {
              const id = identities[t.address as `0x${string}`];
              return (
                <div
                  key={t.address}
                  className="flex items-center justify-between rounded border border-slate-200 px-2 py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: id?.color || "#888888" }}
                      aria-hidden
                    />
                    <div className="truncate">
                      <span className="font-medium">
                        {id?.name || shortAddr(t.address)}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {shortAddr(t.address)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">{t.wins} wins</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
