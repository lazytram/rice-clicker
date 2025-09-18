"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { Howl } from "howler";
import { useQueryClient } from "@tanstack/react-query";
import {
  encodeFunctionData,
  webSocket,
  createWalletClient,
  createPublicClient,
} from "viem";
import { riseTestnet } from "viem/chains";
import { createPublicShredClient, sendRawTransactionSync } from "shreds/viem";
import { ClickCounterAbi } from "@/abi/ClickCounter";
import { useToast } from "@/components/Toast";
import { formatFriendlyError, isInsufficientFunds } from "@/lib/errors";
import FundModal from "@/components/FundModal";
import { privateKeyToAccount } from "viem/accounts";
import { useGlobalClicks } from "@/hooks/useGlobalClicks";

export default function RiceClicker() {
  const [bubbleKey, setBubbleKey] = React.useState(0);
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const { data: globalClicks = 0 } = useGlobalClicks();
  const RICE_IMAGES = React.useMemo(
    () => [
      "/rice-aaaa.png",
      "/rice-angry.png",
      "/rice-beg.png",
      "/rice-cool.png",
      "/rice-cry.png",
      "/rice-haha.png",
      "/rice-love.png",
      "/rice-oo.png",
      "/rice-shy.png",
      "/rice-wat.png",
    ],
    []
  );
  const [currentRiceSrc, setCurrentRiceSrc] = React.useState<string>(
    encodeURI(RICE_IMAGES[0])
  );
  const controls = useAnimationControls();
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [fundOpen, setFundOpen] = React.useState(false);

  // Stable RPC URL (env or fallback)
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

  // Simple nonce manager for the embedded key path
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

  // Load embedded dev key address (if any)
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

  const onClickRice = async () => {
    setBubbleKey((k) => k + 1);
    const pick = RICE_IMAGES[Math.floor(Math.random() * RICE_IMAGES.length)];
    setCurrentRiceSrc(encodeURI(pick));
    controls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.25, ease: "easeOut" },
    });

    // Enforce embedded wallet usage
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) {
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
      const rpc = wsUrl;
      const GAS_TIP = 1n;
      const DEFAULT_GAS_PRICE = 1n;
      const client = createWalletClient({
        account,
        chain: riseTestnet,
        transport: webSocket(rpc),
      });
      const addressContract = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`;
      const nonce = await getNextEmbeddedNonce(account.address);
      const data = encodeFunctionData({
        abi: ClickCounterAbi,
        functionName: "click",
        args: [],
      });
      const gasEstimated = await publicClient.estimateGas({
        account: account.address,
        to: addressContract,
        data,
      });
      const gas = (gasEstimated * BigInt(105)) / BigInt(100);
      const serialized: `0x${string}` = await (async () => {
        try {
          const block = await publicClient.getBlock({ blockTag: "pending" });
          if (block.baseFeePerGas != null) {
            const maxFeePerGas = block.baseFeePerGas + GAS_TIP;
            return client.signTransaction({
              chain: riseTestnet,
              account,
              to: addressContract,
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
            to: addressContract,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        } catch {
          return client.signTransaction({
            chain: riseTestnet,
            account,
            to: addressContract,
            data,
            nonce: Number(nonce),
            gas,
            gasPrice: DEFAULT_GAS_PRICE,
          });
        }
      })();
      const shredClient = createPublicShredClient({
        chain: riseTestnet,
        transport: webSocket(rpc),
      });
      await sendRawTransactionSync(shredClient, {
        serializedTransaction: serialized,
      });

      queryClient.invalidateQueries({ queryKey: ["global-clicks"] });
      queryClient.invalidateQueries({ queryKey: ["global-clicks-onchain"] });
      return;
    } catch (e) {
      // If nonce got out of sync, reset so next click re-syncs
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e);
      if (msg.includes("nonce")) embeddedNextNonceRef.current = null;
      if (isInsufficientFunds(e)) {
        setFundOpen(true);
      }
      const toast = formatFriendlyError(e, "tx");
      show(toast);
      return;
    }
  };

  const samuraiCount = React.useMemo(() => {
    if (!globalClicks || globalClicks < 1000) return 0;
    return Math.floor(globalClicks / 1000);
  }, [globalClicks]);

  const samuraiPositions = React.useMemo(() => {
    const positions: Array<{
      left: string;
      bottom: string;
      scale: number;
      rot: number;
    }> = [];
    const ringRadius = 120; // px around the rice
    for (let i = 0; i < samuraiCount; i++) {
      const angle = (i / Math.max(6, samuraiCount)) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * (ringRadius * 0.5);
      positions.push({
        left: `${150 + x}px`,
        bottom: `${60 + y}px`,
        scale: 0.9 + (i % 5) * 0.03,
        rot: ((i * 13) % 10) - 5,
      });
    }
    return positions;
  }, [samuraiCount]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6">
      <div className="relative w-[300px] h-[300px] flex items-center justify-center translate-y-1">
        {/* Soft ground shadow */}
        <motion.div
          initial={{ opacity: 0.18, scaleX: 0.7 }}
          animate={{ opacity: 0.22, scaleX: [0.7, 0.85, 0.7] }}
          transition={{ duration: 0.28 }}
          className="absolute bottom-6 w-44 h-6 bg-black/20 rounded-full blur-md"
        />

        {/* Samurai army spawns per 1000 global clicks */}
        <AnimatePresence>
          {samuraiPositions.map((p, idx) => (
            <motion.div
              key={`samurai-${idx}`}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: p.scale, y: 0, rotate: p.rot }}
              exit={{ opacity: 0, scale: 0.6, y: 10 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.03, 0.6) }}
              className="pointer-events-none absolute select-none"
              style={{ left: p.left, bottom: p.bottom }}
            >
              <span className="text-[18px]">🥷</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.button
          onClick={onClickRice}
          animate={controls}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-full"
        >
          <Image
            src={currentRiceSrc}
            alt="Rice"
            width={200}
            height={200}
            unoptimized
          />
          {/* ambient glow */}
          <div className="pointer-events-none absolute inset-0 rounded-full" />
        </motion.button>
        {/* Particle burst */}
        <AnimatePresence>
          <motion.div
            key={`burst-${bubbleKey}`}
            initial={{ opacity: 0.6, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="pointer-events-none absolute w-44 h-44 rounded-full border-2 border-rose-300/50"
          />
        </AnimatePresence>
        <AnimatePresence>
          <motion.div
            key={bubbleKey}
            initial={{ opacity: 1, y: 0, scale: 0.95 }}
            animate={{ opacity: 0, y: -50, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute -top-1 select-none z-10"
          >
            <div className="arise-bubble font-extrabold text-[18px]">aRISE</div>
          </motion.div>
        </AnimatePresence>
      </div>
      <FundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        embeddedAddress={embeddedAddr}
      />
    </div>
  );
}
