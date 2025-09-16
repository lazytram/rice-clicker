"use client";

import React from "react";
import type { RaceLog, Identity } from "@/hooks/useRaceResults";
import RaceCard from "@/components/RaceCard";
import ResultsStats from "@/components/ResultsStats";

type Props = {
  races: RaceLog[] | null;
  identities: Record<string, Identity>;
  loading: boolean;
  error: string | null;
  onSaved?: () => void;
};

export default function RaceResultsList({
  races,
  identities,
  loading,
  error,
  onSaved,
}: Props) {
  return (
    <div className="hud-card p-0 overflow-hidden w-full max-w-5xl mx-auto">
      <ResultsStats races={races} identities={identities} />
      {error && (
        <div className="p-4 text-red-600">
          <div className="font-medium">Erreur</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      {loading && <div className="p-4 text-sm text-slate-500">Loading…</div>}
      {!loading && (!races || races.length === 0) && (
        <div className="p-4 text-sm text-slate-500">No races found.</div>
      )}
      {!loading && races && races.length > 0 && (
        <div className="divide-y divide-slate-200">
          {races.map((r) => (
            <RaceCard
              key={`${r.id.toString()}-${r.endedAt.toString()}`}
              race={r}
              identities={identities}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
