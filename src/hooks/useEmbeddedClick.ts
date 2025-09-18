"use client";

import React from "react";
import {
  encodeFunctionData,
  http,
  createWalletClient,
  createPublicClient,
} from "viem";
import { riseTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ClickCounterAbi } from "@/abi/ClickCounter";
import { createPublicShredClient, sendRawTransactionSync } from "shreds/viem";
import { useToast } from "@/components/Toast";
import { formatFriendlyError, isInsufficientFunds } from "@/lib/errors";

type UseEmbeddedClickArgs = {
  rpcUrl: string;
  getNextEmbeddedNonce: (addr: `0x${string}`) => Promise<bigint>;
  onRequireFunding?: () => void;
  onInsufficientFunds?: () => void;
  onSent?: () => void;
  onError?: (e: unknown) => void;
  onNonceReset?: () => void;
};

export function useEmbeddedClick({
  rpcUrl,
  getNextEmbeddedNonce,
  onRequireFunding,
  onInsufficientFunds,
  onSent,
  onError,
  onNonceReset,
}: UseEmbeddedClickArgs) {
  const { show } = useToast();

  return React.useCallback(async () => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) {
        onRequireFunding?.();
        show({
          type: "info",
          title: "Embedded required",
          message: "Enable the embedded key from the Wallet menu",
        });
        return;
      }
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const account = privateKeyToAccount(pk);
      const client = createWalletClient({
        account,
        chain: riseTestnet,
        transport: http(rpcUrl),
      });
      const publicClient = createPublicClient({
        chain: riseTestnet,
        transport: http(rpcUrl),
      });
      const contractAddress = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;
      const nonce = await getNextEmbeddedNonce(account.address);
      const data = encodeFunctionData({
        abi: ClickCounterAbi,
        functionName: "click",
        args: [],
      });
      // Estimate gas via RPC using a public client
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: contractAddress,
        data,
      });
      const gas = (gasEstimated * BigInt(105)) / BigInt(100);
      let serialized: `0x${string}`;
      try {
        const block = await publicClient.getBlock({ blockTag: "pending" });
        if (block.baseFeePerGas != null) {
          const tip = BigInt(1);
          const maxFeePerGas = block.baseFeePerGas + tip;
          serialized = await client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            maxFeePerGas,
            maxPriorityFeePerGas: tip,
          });
        } else {
          const gasPrice = BigInt(1);
          serialized = await client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice,
          });
        }
      } catch {
        const gasPrice = BigInt(1);
        serialized = await client.signTransaction({
          chain: riseTestnet,
          account,
          to: contractAddress,
          data,
          nonce: Number(nonce),
          gas,
          gasPrice,
        });
      }
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: http(rpcUrl),
      });
      await sendRawTransactionSync(shredClient, {
        serializedTransaction: serialized,
      });
      onSent?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e);
      if (msg.includes("nonce")) onNonceReset?.();
      if (isInsufficientFunds(e)) onInsufficientFunds?.();
      const toast = formatFriendlyError(e, "tx");
      show(toast);
      onError?.(e);
    }
  }, [
    rpcUrl,
    getNextEmbeddedNonce,
    onRequireFunding,
    onSent,
    onError,
    onInsufficientFunds,
    onNonceReset,
    show,
  ]);
}
