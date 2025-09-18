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
      // Estimate gas (same as clicker)
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: contractAddress,
        data,
      });
      const gas = (gasEstimated * BigInt(105)) / BigInt(100);
      const GAS_TIP = 1n;
      const DEFAULT_GAS_PRICE = 1n;

      // Optional pre-check (same assumptions as clicker)
      try {
        const bal = await publicClient.getBalance({ address: account.address });
        const required = gas * DEFAULT_GAS_PRICE;
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

      const serialized: `0x${string}` = await (async () => {
        // Match clicker: prefer EIP-1559 if baseFee present, else legacy. Fallback to legacy on error.
        try {
          const block = await publicClient.getBlock({ blockTag: "pending" });
          if (block.baseFeePerGas != null) {
            const maxFeePerGas = block.baseFeePerGas + GAS_TIP;
            return client.signTransaction({
              chain: riseTestnet,
              account,
              to: contractAddress,
              data,
              nonce: Number(nonce),
              gas,
              maxFeePerGas,
              maxPriorityFeePerGas: GAS_TIP,
            });
          }
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        } catch {
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: contractAddress,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        }
      })();
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
