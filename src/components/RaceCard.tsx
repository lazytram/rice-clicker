"use client";

import React from "react";
import type { RaceLog, Identity } from "@/hooks/useRaceResults";
import ParticipantRow from "@/components/ParticipantRow";
import UriActions from "@/components/UriActions";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { RaceRegistryAbi } from "@/abi/RaceRegistry";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTs(ts: bigint) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}

type Props = {
  race: RaceLog;
  identities: Record<string, Identity>;
  onSaved?: () => void;
};

export default function RaceCard({ race: r, identities, onSaved }: Props) {
  const { address } = useAccount();
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const registryAddress = (process.env.NEXT_PUBLIC_RACE_REGISTRY_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  React.useEffect(() => {
    if (isSuccess && onSaved) onSaved();
  }, [isSuccess, onSaved]);

  const [savingFor, setSavingFor] = React.useState<boolean>(false);
  const [validating, setValidating] = React.useState<boolean>(false);
  const [uri, setUri] = React.useState<string>("");

  const winnerId = identities[r.winner];
  const isWinner =
    !!address && r.winner && address.toLowerCase() === r.winner.toLowerCase();
  const canValidate = !!r.pendingWinnerGameUri && !r.winnerGameUri;
  const max = r.finishTotals.reduce((m, v) => (v > m ? v : m), 0n);

  const onPropose = async () => {
    const v = uri.trim();
    if (!v) return;
    setSavingFor(true);
    try {
      await writeContractAsync({
        address: registryAddress,
        abi: RaceRegistryAbi,
        functionName: "proposeWinnerGame",
        args: [r.id, v],
      });
    } finally {
      setSavingFor(false);
    }
  };

  const onValidate = async () => {
    setValidating(true);
    try {
      await writeContractAsync({
        address: registryAddress,
        abi: RaceRegistryAbi,
        functionName: "validateWinnerGame",
        args: [r.id],
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Race #{r.id.toString()}</div>
        <div className="text-xs text-slate-400">{formatTs(r.endedAt)}</div>
      </div>

      <div className="mt-1">
        <div className="text-sm">Winner</div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: winnerId?.color || "#888888" }}
            aria-hidden
          />
          <div className="font-medium">
            {winnerId?.name || shortAddr(r.winner)}
          </div>
          <div className="text-xs text-slate-400">{shortAddr(r.winner)}</div>
          {r.winnerGameUri && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Saved
            </span>
          )}
          {!r.winnerGameUri && r.pendingWinnerGameUri && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Pending
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm">Participants</div>
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {r.players.map((p, idx) => (
            <ParticipantRow
              key={`${p}-${idx}`}
              address={p}
              total={r.finishTotals[idx] ?? 0n}
              identity={identities[p]}
              max={max}
            />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm">Winner save</div>
        {r.winnerGameUri && (
          <div className="text-xs text-slate-600 break-all">
            Saved URI: {r.winnerGameUri}
            <UriActions
              uri={r.winnerGameUri}
              storageKey={`saved-${r.id.toString()}`}
            />
          </div>
        )}
        {!r.winnerGameUri && r.pendingWinnerGameUri && (
          <div className="text-xs text-slate-500 break-all">
            Pending: {r.pendingWinnerGameUri}
            <UriActions
              uri={r.pendingWinnerGameUri}
              storageKey={`pending-${r.id.toString()}`}
            />
          </div>
        )}
        {!r.winnerGameUri && isWinner && (
          <div className="flex items-center gap-2 mt-2">
            <input
              className="input"
              placeholder="https://... or ipfs://..."
              value={uri}
              onChange={(e) => setUri(e.target.value)}
            />
            <button
              className="btn"
              onClick={onPropose}
              disabled={isPending || isConfirming || savingFor}
            >
              {savingFor && (isPending || isConfirming)
                ? "Proposing…"
                : "Propose"}
            </button>
          </div>
        )}
        {!r.winnerGameUri && canValidate && (
          <div className="mt-2">
            <button
              className="btn"
              onClick={onValidate}
              disabled={isPending || isConfirming || validating}
            >
              {validating && (isPending || isConfirming)
                ? "Validating…"
                : "Validate (finalizer)"}
            </button>
          </div>
        )}
        {!r.winnerGameUri && !isWinner && !r.pendingWinnerGameUri && (
          <div className="text-xs text-slate-400">
            Winner can propose a game URI.
          </div>
        )}
      </div>
    </div>
  );
}
