"use client";

import React from "react";
import { createPublicClient, http } from "viem";
import { riseTestnet } from "viem/chains";

export function useEmbeddedNonce(rpcUrl: string) {
  const publicClient = React.useMemo(
    () =>
      createPublicClient({
        chain: riseTestnet,
        transport: http(rpcUrl),
      }),
    [rpcUrl]
  );

  const embeddedNextNonceRef = React.useRef<bigint | null>(null);
  const embeddedNonceChainRef = React.useRef<Promise<void>>(Promise.resolve());

  const getNextEmbeddedNonce = React.useCallback(
    async (addr: `0x${string}`) => {
      const assign = async () => {
        if (embeddedNextNonceRef.current === null) {
          const remote = await publicClient.getTransactionCount({
            address: addr,
            blockTag: "pending",
          });
          embeddedNextNonceRef.current = BigInt(remote);
        }
        const current = embeddedNextNonceRef.current!;
        embeddedNextNonceRef.current = current + BigInt(1);
        return current;
      };
      const p = embeddedNonceChainRef.current.then(assign, assign);
      embeddedNonceChainRef.current = p.then(
        () => undefined,
        () => undefined
      );
      return p;
    },
    [publicClient]
  );

  const resetEmbeddedNonce = React.useCallback(() => {
    embeddedNextNonceRef.current = null;
  }, []);

  return { getNextEmbeddedNonce, resetEmbeddedNonce } as const;
}
