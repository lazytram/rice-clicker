"use client";

import React from "react";
import { useToast } from "@/components/Toast";
import { useRaceLobby } from "@/hooks/useRaceLobby";
import {
  DEFAULT_RACE_THRESHOLD,
  RACE_THRESHOLD_OPTIONS,
} from "@/lib/constants";
import { useEmbeddedNonce } from "@/hooks/useEmbeddedNonce";
import { useEmbeddedClick } from "@/hooks/useEmbeddedClick";
import { usePodiumExport } from "@/hooks/usePodiumExport";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  webSocket,
} from "viem";
import { riseTestnet } from "viem/chains";
import { ClickCounterAbi } from "@/abi/ClickCounter";

export function useHorseRaceController() {
  const [address, setAddress] = React.useState<string | null>(null);
  const [lobbyId, setLobbyId] = React.useState<string | null>(null);
  const { lobby, create, joinAny, join, leave, advance } = useRaceLobby(
    lobbyId || undefined
  );
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#ff5a5f");
  const [capacity, setCapacity] = React.useState(5);
  const [createThreshold, setCreateThreshold] = React.useState<number>(
    DEFAULT_RACE_THRESHOLD
  );
  const [joinLobbyIdInput, setJoinLobbyIdInput] = React.useState("");
  const [flow, setFlow] = React.useState<"create" | "join">("create");
  const [fundOpen, setFundOpen] = React.useState(false);
  const { show } = useToast();
  // Load persisted name/color for smoother rejoin on refresh
  React.useEffect(() => {
    try {
      const n =
        typeof window !== "undefined"
          ? localStorage.getItem("race_name")
          : null;
      const c =
        typeof window !== "undefined"
          ? localStorage.getItem("race_color")
          : null;
      if (n) setName(n);
      if (c) setColor(c);
    } catch {}
  }, []);

  // Persist name/color changes
  React.useEffect(() => {
    try {
      if (name) localStorage.setItem("race_name", name);
    } catch {}
  }, [name]);
  React.useEffect(() => {
    try {
      if (color) localStorage.setItem("race_color", color);
    } catch {}
  }, [color]);

  // Initialize from URL (?lobby=ID) or localStorage fallback
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("lobby");
      const fromStorage =
        typeof window !== "undefined"
          ? window.localStorage.getItem("race_lobby_id")
          : null;
      const nextId = fromUrl || fromStorage;
      if (nextId) {
        setLobbyId(nextId);
        setJoinLobbyIdInput(nextId);
        setFlow("join");
      }
    } catch {}
  }, []);

  // Keep URL in sync with current lobby id
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (lobbyId) {
        url.searchParams.set("lobby", lobbyId);
        // ensure race mode for shared links
        url.searchParams.set("mode", "race");
        // persist for refresh safety
        try {
          window.localStorage.setItem("race_lobby_id", lobbyId);
        } catch {}
      } else {
        url.searchParams.delete("lobby");
        try {
          window.localStorage.removeItem("race_lobby_id");
        } catch {}
      }
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [lobbyId]);

  React.useEffect(() => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) return setAddress(null);
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const acct = privateKeyToAccount(pk);
      setAddress(acct.address);
    } catch {
      setAddress(null);
    }
  }, []);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws";

  const { getNextEmbeddedNonce, resetEmbeddedNonce } = useEmbeddedNonce(rpcUrl);

  const meIn = React.useMemo(() => {
    if (!address || !lobby) return undefined;
    return lobby.players.find(
      (p) => p.address.toLowerCase() === address.toLowerCase()
    );
  }, [lobby, address]);

  const status = lobby?.status;
  const threshold = lobby?.threshold ?? DEFAULT_RACE_THRESHOLD;
  // Auto-join on refresh if we have address + lobbyId + name and we're not in yet
  React.useEffect(() => {
    (async () => {
      try {
        if (!address || !lobbyId || !lobby) return;
        if (meIn) return;
        if (!name.trim()) return; // require a name
        // Only auto-join if race hasn't finished
        if (lobby.status === "finished") return;
        await join({ lobbyId, address, name, color });
      } catch {}
    })();
  }, [address, lobbyId, lobby, meIn, name, color, join]);

  // Estimate required native token to finish a race and ensure balance
  const ensureBalanceForRace = React.useCallback(
    async (clicksNeeded: number): Promise<boolean> => {
      try {
        const k =
          typeof window !== "undefined"
            ? localStorage.getItem("embedded_privkey")
            : null;
        if (!k) {
          setFundOpen(true);
          show({
            type: "info",
            title: "Embedded required",
            message: "Enable the embedded key from the Wallet menu",
          });
          return false;
        }
        const pk = k.startsWith("0x")
          ? (k as `0x${string}`)
          : (("0x" + k) as `0x${string}`);
        const account = privateKeyToAccount(pk);

        const publicClient = createPublicClient({
          chain: riseTestnet,
          transport: webSocket(rpcUrl),
        });

        const contractAddress = (process.env
          .NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
          "0x0000000000000000000000000000000000000000") as `0x${string}`;
        const data = encodeFunctionData({
          abi: ClickCounterAbi,
          functionName: "click",
          args: [],
        });

        // Per-click gas estimate with buffer
        const gasEstimated = await publicClient.estimateGas({
          account: account.address,
          to: contractAddress,
          data,
        });
        const gasPerClick = (gasEstimated * 105n) / 100n; // +5%

        // Price per gas (use EIP-1559 baseFee + small tip if available, else 1)
        let pricePerGas = 1n;
        try {
          const block = await publicClient.getBlock({ blockTag: "pending" });
          if (block.baseFeePerGas != null)
            pricePerGas = block.baseFeePerGas + 1n;
        } catch {}

        const requiredWei =
          gasPerClick *
          BigInt(Math.max(1, Math.floor(clicksNeeded))) *
          pricePerGas;
        const bal = await publicClient.getBalance({ address: account.address });
        if (bal < requiredWei) {
          setFundOpen(true);
          show({
            type: "error",
            title: "Insufficient funds",
            message: `Need about ${formatEther(
              requiredWei
            )} to complete a race.\nCurrent balance: ${formatEther(bal)}`,
          });
          return false;
        }
        return true;
      } catch {
        // If estimation fails, allow join to avoid blocking due to RPC hiccups
        return true;
      }
    },
    [rpcUrl, show]
  );

  const onCreateRace = React.useCallback(async () => {
    if (!address) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before creating a race.",
      });
      return;
    }
    const next = await create({
      capacity: Math.max(2, Math.min(10, capacity || 5)),
      threshold: RACE_THRESHOLD_OPTIONS.includes(createThreshold)
        ? createThreshold
        : DEFAULT_RACE_THRESHOLD,
      address,
      name,
      color,
    });
    setLobbyId(next.id);
  }, [address, capacity, color, create, name, show]);

  const onJoinAnyRace = React.useCallback(async () => {
    if (!address) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    const ok = await ensureBalanceForRace(DEFAULT_RACE_THRESHOLD);
    if (!ok) return;
    const next = await joinAny({
      address,
      name,
      color,
    });
    setLobbyId(next.id);
  }, [address, color, ensureBalanceForRace, joinAny, name, show]);

  const onJoinById = React.useCallback(async () => {
    if (!address || !joinLobbyIdInput) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    let clicksNeeded = DEFAULT_RACE_THRESHOLD;
    try {
      const res = await fetch(
        `/api/race/lobby?id=${encodeURIComponent(joinLobbyIdInput)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const j = await res.json();
        if (typeof j?.threshold === "number") clicksNeeded = j.threshold;
      }
    } catch {}
    const ok = await ensureBalanceForRace(clicksNeeded);
    if (!ok) return;
    await join({
      lobbyId: joinLobbyIdInput,
      address,
      name,
      color,
    });
    setLobbyId(joinLobbyIdInput);
  }, [
    address,
    color,
    ensureBalanceForRace,
    join,
    joinLobbyIdInput,
    name,
    show,
  ]);

  const onJoin = React.useCallback(async () => {
    if (!address || !lobbyId) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    const ok = await ensureBalanceForRace(threshold);
    if (!ok) return;
    await join({
      lobbyId,
      address,
      name,
      color,
    });
  }, [
    address,
    ensureBalanceForRace,
    join,
    lobbyId,
    name,
    color,
    threshold,
    show,
  ]);

  const onLeave = React.useCallback(async () => {
    if (!address || !lobbyId) return;
    await leave({ lobbyId, address });
    setLobbyId(null);
    setJoinLobbyIdInput("");
    try {
      window.localStorage.removeItem("race_lobby_id");
    } catch {}
  }, [address, leave, lobbyId]);

  // Exit: leave (if possible), clear URL and storage
  const onExitLobby = React.useCallback(async () => {
    try {
      if (address && lobbyId && lobby?.status === "waiting") {
        try {
          await leave({ lobbyId, address });
        } catch {}
      }
      setLobbyId(null);
      setJoinLobbyIdInput("");
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("lobby");
        url.searchParams.delete("mode");
        window.history.replaceState({}, "", url.toString());
      } catch {}
      try {
        window.localStorage.removeItem("race_lobby_id");
      } catch {}
    } catch {}
  }, [address, lobbyId, lobby, leave]);

  const sendEmbeddedClick = useEmbeddedClick({
    rpcUrl,
    getNextEmbeddedNonce,
    onRequireFunding: () => setFundOpen(true),
    onInsufficientFunds: () => setFundOpen(true),
    onNonceReset: () => resetEmbeddedNonce(),
  });

  const onClickAdvance = React.useCallback(async () => {
    if (!address || !lobbyId) return;
    try {
      void advance({ lobbyId, address, amount: 1 });
    } catch {}
    await sendEmbeddedClick();
  }, [address, advance, lobbyId, sendEmbeddedClick]);

  const onNewRace = React.useCallback(async () => {
    try {
      if (!address) return;
      if (!name.trim()) {
        show({
          type: "info",
          title: "Name required",
          message: "Please enter your name before creating a race.",
        });
        return;
      }
      const next = await create({
        capacity: Math.max(2, Math.min(10, lobby?.capacity || 5)),
        threshold: RACE_THRESHOLD_OPTIONS.includes(createThreshold)
          ? createThreshold
          : DEFAULT_RACE_THRESHOLD,
        address,
        name,
        color,
      });
      setLobbyId(next.id);
    } catch {}
  }, [address, color, create, lobby?.capacity, name, show]);

  const onNewRaceAndJoin = onNewRace;

  const onExportPodium = usePodiumExport(
    lobby?.players || [],
    threshold,
    lobby?.id || null
  );

  return {
    // state
    address,
    lobbyId,
    lobby,
    name,
    setName,
    color,
    setColor,
    capacity,
    setCapacity,
    createThreshold,
    setCreateThreshold,
    joinLobbyIdInput,
    setJoinLobbyIdInput,
    flow,
    setFlow,
    fundOpen,
    setFundOpen,
    // derived
    meIn: !!meIn,
    status,
    threshold,
    // handlers
    onCreateRace,
    onJoinAnyRace,
    onJoinById,
    onJoin,
    onLeave,
    onExitLobby,
    onClickAdvance,
    onNewRace,
    onNewRaceAndJoin,
    onExportPodium,
  } as const;
}
