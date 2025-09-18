"use client";

import React from "react";
import {
  encodeFunctionData,
  webSocket,
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
        transport: webSocket(rpcUrl),
      });
      const publicClient = createPublicClient({
        chain: riseTestnet,
        transport: webSocket(rpcUrl),
      });
      const contractAddress = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;
      const nonce = await getNextEmbeddedNonce(account.address);
      const data = encodeFunctionData({
        abi: ClickCounterAbi,
        functionName: "click",
        args: [],
      });
      // Estimate gas and prefer legacy tx with ultra-low gasPrice (env override)
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: contractAddress,
        data,
      });
      const gas = (gasEstimated * BigInt(101)) / BigInt(100);
      const envPrice =
        typeof process !== "undefined" && process.env.NEXT_PUBLIC_GAS_PRICE_WEI
          ? BigInt(process.env.NEXT_PUBLIC_GAS_PRICE_WEI)
          : BigInt(1);
      const gasPrice = envPrice < BigInt(0) ? BigInt(0) : envPrice;

      // Optional pre-check to avoid false "insufficient funds" popups
      try {
        const bal = await publicClient.getBalance({ address: account.address });
        const required = gas * gasPrice;
        if (bal < required) {
          onInsufficientFunds?.();
          show({
            type: "error",
            title: "Insufficient funds",
            message: "Balance is lower than the minimal network fee.",
          });
          return;
        }
      } catch {}

      let serialized: `0x${string}`;
      // Force legacy (type-0) to avoid baseFee on EIP-1559 chains
      try {
        serialized = await client.signTransaction({
          chain: riseTestnet,
          account,
          to: contractAddress,
          data,
          nonce: Number(nonce),
          gas,
          gasPrice,
        });
      } catch {
        // Fallback to EIP-1559 with 1 wei priority fee
        const block = await publicClient.getBlock({ blockTag: "pending" });
        const tip = BigInt(1);
        const base = block.baseFeePerGas ?? BigInt(0);
        const maxFeePerGas = base + tip;
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
      }
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: webSocket(rpcUrl),
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
