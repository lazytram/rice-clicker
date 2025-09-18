"use client";

import React from "react";
import { createPublicClient, webSocket, parseAbiItem } from "viem";
import { riseTestnet } from "viem/chains";
import { RaceRegistryAbi } from "@/abi/RaceRegistry";

export type Address = `0x${string}`;

export type RaceLog = {
  id: bigint;
  winner: Address;
  players: Address[];
  finishTotals: bigint[];
  endedAt: bigint;
  winnerGameUri?: string;
  pendingWinnerGameUri?: string;
};

export type Identity = {
  name: string;
  color: string; // #rrggbb
};

export function useRaceResults() {
  const [races, setRaces] = React.useState<RaceLog[] | null>(null);
  const [identities, setIdentities] = React.useState<Record<string, Identity>>(
    {}
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [version, setVersion] = React.useState(0);

  const wsUrl =
    process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws";
  const registryAddress = (process.env.NEXT_PUBLIC_RACE_REGISTRY_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as Address;

  const client = React.useMemo(
    () =>
      createPublicClient({
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      }),
    [wsUrl]
  );

  React.useEffect(() => {
    let disposed = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (
          !registryAddress ||
          registryAddress ===
            ("0x0000000000000000000000000000000000000000" as Address)
        ) {
          throw new Error(
            "NEXT_PUBLIC_RACE_REGISTRY_ADDRESS non défini. Déploie le contrat et renseigne l'ENV."
          );
        }
        const event = parseAbiItem(
          "event RaceFinalized(uint64 id, address winner, address[] players, uint256[] finishTotals, uint64 endedAt)"
        );
        const logs = await client.getLogs({
          address: registryAddress,
          event,
          fromBlock: 0n,
          toBlock: "latest",
        });
        const parsed: RaceLog[] = logs
          .map((l) => ({
            id: l.args.id as bigint,
            winner:
              (l.args.winner as Address) ||
              ("0x0000000000000000000000000000000000000000" as Address),
            players: (l.args.players as Address[]) || [],
            finishTotals: (l.args.finishTotals as bigint[]) || [],
            endedAt: l.args.endedAt as bigint,
          }))
          .sort((a, b) => Number(b.endedAt - a.endedAt));
        if (disposed) return;
        // Load winner URIs for each race (final + pending)
        if (parsed.length) {
          const uriCalls = parsed.map((r) => ({
            address: registryAddress,
            abi: RaceRegistryAbi,
            functionName: "winnerGameUriByRaceId" as const,
            args: [r.id],
          }));
          const pendingCalls = parsed.map((r) => ({
            address: registryAddress,
            abi: RaceRegistryAbi,
            functionName: "pendingWinnerGameUriByRaceId" as const,
            args: [r.id],
          }));
          const [uriRes, pendingRes] = await Promise.all([
            client.multicall({ contracts: uriCalls }),
            client.multicall({ contracts: pendingCalls }),
          ]);
          for (let i = 0; i < parsed.length; i++) {
            const res = uriRes[i];
            parsed[i].winnerGameUri =
              res.status === "success" ? (res.result as string) || "" : "";
            const pres = pendingRes[i];
            parsed[i].pendingWinnerGameUri =
              pres.status === "success" ? (pres.result as string) || "" : "";
          }
        }
        setRaces(parsed);

        const unique = Array.from(
          new Set(
            parsed.flatMap((r) => [r.winner, ...r.players]).filter(Boolean)
          )
        ) as Address[];
        if (unique.length) {
          const calls = unique.flatMap((addr) => [
            {
              address: registryAddress,
              abi: RaceRegistryAbi,
              functionName: "nameByAddress" as const,
              args: [addr],
            },
            {
              address: registryAddress,
              abi: RaceRegistryAbi,
              functionName: "colorByAddress" as const,
              args: [addr],
            },
          ]);
          const res = await client.multicall({ contracts: calls });
          const next: Record<string, Identity> = {};
          for (let i = 0; i < unique.length; i++) {
            const nameRes = res[i * 2];
            const colorRes = res[i * 2 + 1];
            const name =
              nameRes.status === "success" ? (nameRes.result as string) : "";
            const colorNum =
              colorRes.status === "success"
                ? (colorRes.result as bigint | number)
                : 0;
            const rgb = BigInt(colorNum as bigint);
            const hex = `#${rgb.toString(16).padStart(6, "0")}`;
            next[unique[i]] = { name, color: hex };
          }
          if (!disposed) setIdentities(next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    load();
    return () => {
      disposed = true;
    };
  }, [client, registryAddress, version]);

  const reload = React.useCallback(() => setVersion((v) => v + 1), []);

  return { races, identities, loading, error, reload } as const;
}
