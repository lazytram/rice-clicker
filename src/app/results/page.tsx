"use client";

import React from "react";
import { useRaceResults } from "@/hooks/useRaceResults";
import RaceResultsList from "@/components/RaceResultsList";
import Navbar from "@/components/Navbar";

export default function ResultsPage() {
  const { races, identities, loading, error, reload } = useRaceResults();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6 gap-6 pt-24">
      <Navbar mode="race" peersCount={0} showPeersPill={false} />

      <div className="hud-card p-6 text-center w-full max-w-5xl mx-auto">
        <h1 className="text-2xl font-extrabold">Race results</h1>
        <p className="text-sm text-slate-600 mt-1">
          Historical finalized races from the on-chain registry
        </p>
      </div>

      <RaceResultsList
        races={races}
        identities={identities}
        loading={loading}
        error={error}
        onSaved={reload}
      />
    </div>
  );
}
