"use client";

import React from "react";

type Item = {
  address: string;
  name: string;
  color: string; // #RRGGBB
  clicks: number;
  threshold: number;
};

export default function RaceActivity({ items }: { items: Item[] }) {
  if (!items?.length) return null;
  return (
    <div className="hud-card p-3 w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((p) => {
          const ratio =
            p.threshold > 0 ? Math.min(1, p.clicks / p.threshold) : 0;
          const percent = Math.round(ratio * 100);
          return (
            <div
              key={p.address}
              className="hud-pill items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block w-3 h-3 rounded-full border"
                  style={{
                    background: p.color,
                    borderColor: "rgba(0,0,0,0.15)",
                  }}
                  title={p.color}
                />
                <span className="font-bold text-slate-900 text-sm">
                  {p.name || p.address.slice(0, 6)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="hud-badge">{p.clicks}</span>
                {p.threshold > 0 && (
                  <span className="opacity-60">/ {p.threshold}</span>
                )}
                <span className="opacity-70">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
