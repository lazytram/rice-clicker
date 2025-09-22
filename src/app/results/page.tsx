"use client";

import React from "react";
import { useRaceResults } from "@/hooks/useRaceResults";
import RaceResultsList from "@/components/RaceResultsList";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function ResultsPage() {
  const { races, identities, loading, error, reload } = useRaceResults();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6 gap-6 pt-24">
      <Navbar mode="race" peersCount={0} showPeersPill={false} />

      <div className="hud-card p-4 w-full max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-extrabold">Race results</h1>
            <p className="text-sm text-slate-600 mt-1">
              Historical finalized races from the on-chain registry
            </p>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              className="btn"
              onClick={reload}
              aria-label="Refresh results"
            >
              Refresh
            </button>
            <Link
              href="/"
              className="btn primary"
              aria-label="Start a new race"
            >
              Start race
            </Link>
          </div>
        </div>
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
