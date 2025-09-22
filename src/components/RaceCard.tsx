"use client";

import React from "react";
import type { RaceLog, Identity } from "@/hooks/useRaceResults";
import ParticipantRow from "@/components/ParticipantRow";
import UriActions from "@/components/UriActions";
import { RaceRegistryAbi } from "@/abi/RaceRegistry";
import {
  encodeFunctionData,
  webSocket,
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { riseTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicShredClient, sendRawTransactionSync } from "shreds/viem";

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
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const registryAddress = (process.env.NEXT_PUBLIC_RACE_REGISTRY_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  // RPC clients
  const wsUrl =
    process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws";
  const publicClient = React.useMemo(
    () =>
      createPublicClient({
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      }),
    [wsUrl]
  );
  const httpUrl = React.useMemo(() => {
    try {
      if (wsUrl.startsWith("wss://")) {
        return wsUrl.replace(/^wss:\/\//, "https://").replace(/\/ws$/, "");
      }
      if (wsUrl.startsWith("ws://")) {
        return wsUrl.replace(/^ws:\/\//, "http://").replace(/\/ws$/, "");
      }
      return wsUrl.replace(/\/ws$/, "");
    } catch {
      return wsUrl;
    }
  }, [wsUrl]);

  // Embedded account
  React.useEffect(() => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) return setEmbeddedAddr(null);
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const acct = privateKeyToAccount(pk);
      setEmbeddedAddr(acct.address);
    } catch {
      setEmbeddedAddr(null);
    }
  }, []);

  // Nonce management (same approach as clicker)
  const embeddedNextNonceRef = React.useRef<bigint | null>(null);
  const embeddedNonceChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const getNextEmbeddedNonce = React.useCallback(
    async (address: `0x${string}`) => {
      const assignNext = async () => {
        if (embeddedNextNonceRef.current === null) {
          const remote = await publicClient.getTransactionCount({
            address,
            blockTag: "pending",
          });
          embeddedNextNonceRef.current = BigInt(remote);
        }
        const current = embeddedNextNonceRef.current!;
        embeddedNextNonceRef.current = current + 1n;
        return current;
      };
      const next = embeddedNonceChainRef.current.then(assignNext, assignNext);
      embeddedNonceChainRef.current = next.then(
        () => undefined,
        () => undefined
      );
      return next;
    },
    [publicClient]
  );

  const [savingFor, setSavingFor] = React.useState<boolean>(false);
  const [validating, setValidating] = React.useState<boolean>(false);
  const [uri, setUri] = React.useState<string>("");

  const winnerId = identities[r.winner];
  const isWinner =
    !!embeddedAddr &&
    r.winner &&
    embeddedAddr.toLowerCase() === r.winner.toLowerCase();
  const canValidate = !!r.pendingWinnerGameUri && !r.winnerGameUri;
  const max = r.finishTotals.reduce((m, v) => (v > m ? v : m), 0n);

  const onPropose = async () => {
    const v = uri.trim();
    if (!v) return;
    // require embedded key
    const k =
      typeof window !== "undefined"
        ? localStorage.getItem("embedded_privkey")
        : null;
    if (!k) return;
    setSavingFor(true);
    try {
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const account = privateKeyToAccount(pk);
      const client = createWalletClient({
        account,
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      });
      const data = encodeFunctionData({
        abi: RaceRegistryAbi,
        functionName: "proposeWinnerGame",
        args: [r.id, v],
      });
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: registryAddress,
        data,
      });
      const gas = (gasEstimated * 101n) / 100n;
      const GAS_TIP = 0n;
      const DEFAULT_GAS_PRICE = 0n;
      const serialized: `0x${string}` = await (async () => {
        try {
          const block = await publicClient.getBlock({ blockTag: "pending" });
          if (block.baseFeePerGas != null) {
            const maxFeePerGas = block.baseFeePerGas + GAS_TIP;
            return client.signTransaction({
              chain: riseTestnet,
              account,
              to: registryAddress,
              data,
              nonce: Number(await getNextEmbeddedNonce(account.address)),
              gas,
              maxFeePerGas,
              maxPriorityFeePerGas: GAS_TIP,
            });
          }
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: registryAddress,
            data,
            nonce: Number(await getNextEmbeddedNonce(account.address)),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        } catch {
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: registryAddress,
            data,
            nonce: Number(await getNextEmbeddedNonce(account.address)),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        }
      })();
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      });
      try {
        await sendRawTransactionSync(shredClient, {
          serializedTransaction: serialized,
        });
      } catch (e) {
        try {
          const shredHttp = createPublicShredClient({
            chain: riseTestnet,
            transport: http(httpUrl),
          });
          await sendRawTransactionSync(shredHttp, {
            serializedTransaction: serialized,
          });
        } catch {
          const hash = await publicClient.sendRawTransaction({
            serializedTransaction: serialized,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }
      onSaved?.();
    } finally {
      setSavingFor(false);
    }
  };

  const onValidate = async () => {
    const k =
      typeof window !== "undefined"
        ? localStorage.getItem("embedded_privkey")
        : null;
    if (!k) return;
    setValidating(true);
    try {
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const account = privateKeyToAccount(pk);
      const client = createWalletClient({
        account,
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      });
      const data = encodeFunctionData({
        abi: RaceRegistryAbi,
        functionName: "validateWinnerGame",
        args: [r.id],
      });
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: registryAddress,
        data,
      });
      const gas = (gasEstimated * 101n) / 100n;
      const GAS_TIP = 0n;
      const DEFAULT_GAS_PRICE = 0n;
      const serialized: `0x${string}` = await (async () => {
        try {
          const block = await publicClient.getBlock({ blockTag: "pending" });
          if (block.baseFeePerGas != null) {
            const maxFeePerGas = block.baseFeePerGas + GAS_TIP;
            return client.signTransaction({
              chain: riseTestnet,
              account,
              to: registryAddress,
              data,
              nonce: Number(await getNextEmbeddedNonce(account.address)),
              gas,
              maxFeePerGas,
              maxPriorityFeePerGas: GAS_TIP,
            });
          }
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: registryAddress,
            data,
            nonce: Number(await getNextEmbeddedNonce(account.address)),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        } catch {
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: registryAddress,
            data,
            nonce: Number(await getNextEmbeddedNonce(account.address)),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        }
      })();
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      });
      try {
        await sendRawTransactionSync(shredClient, {
          serializedTransaction: serialized,
        });
      } catch (e) {
        try {
          const shredHttp = createPublicShredClient({
            chain: riseTestnet,
            transport: http(httpUrl),
          });
          await sendRawTransactionSync(shredHttp, {
            serializedTransaction: serialized,
          });
        } catch {
          const hash = await publicClient.sendRawTransaction({
            serializedTransaction: serialized,
          });
          await publicClient.waitForTransactionReceipt({ hash });
        }
      }
      onSaved?.();
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
            <UriActions uri={r.winnerGameUri} />
          </div>
        )}
        {!r.winnerGameUri && r.pendingWinnerGameUri && (
          <div className="text-xs text-slate-500 break-all">
            Pending: {r.pendingWinnerGameUri}
            <UriActions uri={r.pendingWinnerGameUri} />
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
            <button className="btn" onClick={onPropose} disabled={savingFor}>
              {savingFor ? "Proposing…" : "Propose"}
            </button>
          </div>
        )}
        {!r.winnerGameUri && canValidate && (
          <div className="mt-2">
            <button className="btn" onClick={onValidate} disabled={validating}>
              {validating ? "Validating…" : "Validate (finalizer)"}
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
