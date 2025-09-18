"use client";

import { useQuery } from "@tanstack/react-query";
import { createPublicClient, webSocket } from "viem";
import { riseTestnet } from "viem/chains";
import { ClickCounterAbi } from "@/abi/ClickCounter";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export function useGlobalClicks() {
  return useQuery<number>({
    queryKey: ["global-clicks-onchain"],
    queryFn: async () => {
      const wsUrl =
        process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws";
      const client = createPublicClient({
        chain: riseTestnet,
        transport: webSocket(wsUrl),
      });
      const total = (await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: ClickCounterAbi,
        functionName: "totalClicks",
        args: [],
      })) as bigint;
      return Number(total);
    },
    staleTime: 3_000,
    refetchInterval: 3_000,
  });
}
