"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  RealtimeChannel,
  RealtimeBroadcastEnvelope,
} from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export type LobbyPlayer = {
  address: string;
  name: string;
  color: string;
  clicks: number;
};

export type LobbyState = {
  id: string;
  status: "waiting" | "countdown" | "running" | "finished";
  players: LobbyPlayer[];
  countdownEndsAt?: number;
  winner?: string;
  threshold: number;
  startedAt?: number;
  finishedAt?: number;
  capacity: number;
  createdAt: number;
};

async function fetchLobby(lobbyId: string): Promise<LobbyState> {
  const res = await fetch(`/api/race/lobby?id=${encodeURIComponent(lobbyId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed to fetch lobby");
  return res.json();
}

export function useRaceLobby(lobbyId?: string) {
  const qc = useQueryClient();
  const supabase = getSupabaseClient();
  const channelRef = React.useRef<RealtimeChannel | null>(null);

  function mergeMonotonic(
    prev: LobbyState | undefined,
    next: LobbyState
  ): LobbyState {
    if (!prev) return next;
    return {
      ...next,
      players: next.players.map((playerNext) => {
        const playerPrev = prev.players.find(
          (op) => op.address.toLowerCase() === playerNext.address.toLowerCase()
        );
        return playerPrev
          ? {
              ...playerNext,
              clicks: Math.max(playerNext.clicks, playerPrev.clicks),
            }
          : playerNext;
      }),
    };
  }

  function broadcastLobby(next: LobbyState) {
    try {
      type LobbyPayload = { lobby: LobbyState };
      channelRef.current?.send<LobbyPayload>({
        type: "broadcast",
        event: "lobby:update",
        payload: { lobby: next },
      });
    } catch {}
  }

  const query = useQuery<LobbyState>({
    queryKey: ["race-lobby", lobbyId],
    queryFn: () => fetchLobby(lobbyId as string),
    // Keep a light safety poll to pick up server-side transitions
    refetchInterval: lobbyId ? (supabase ? 1000 : 250) : false,
    staleTime: 200,
    enabled: !!lobbyId,
    select: (next): LobbyState => {
      const prev = qc.getQueryData<LobbyState>(["race-lobby", lobbyId]);
      return mergeMonotonic(prev, next);
    },
  });

  // Subscribe to realtime updates for this lobby
  React.useEffect(() => {
    if (!supabase || !lobbyId) return;
    const ch = supabase.channel(`lobby:${lobbyId}`, {
      config: { broadcast: { self: false } },
    });
    type LobbyPayload = { lobby: LobbyState };
    ch.on<LobbyPayload>(
      "broadcast",
      { event: "lobby:update" },
      (msg: RealtimeBroadcastEnvelope<LobbyPayload>) => {
        const next: LobbyState | undefined = msg?.payload?.lobby;
        if (!next || next.id !== lobbyId) return;
        const prev = qc.getQueryData<LobbyState>(["race-lobby", lobbyId]);
        qc.setQueryData(["race-lobby", lobbyId], mergeMonotonic(prev, next));
      }
    );
    ch.subscribe(() => {});
    channelRef.current = ch;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [supabase, lobbyId, qc]);

  const create = useMutation({
    mutationFn: async (p: {
      capacity?: number;
      threshold?: number;
      address: string;
      name: string;
      color: string;
    }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", ...p }),
      });
      if (!res.ok) throw new Error("create failed");
      return res.json() as Promise<LobbyState>;
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", lobbyId], next);
      broadcastLobby(next);
    },
  });

  const joinAny = useMutation({
    mutationFn: async (p: { address: string; name: string; color: string }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "joinAny", ...p }),
      });
      if (!res.ok) throw new Error("joinAny failed");
      return res.json() as Promise<LobbyState>;
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", next.id], next);
      broadcastLobby(next);
    },
  });

  const join = useMutation({
    mutationFn: async (p: {
      lobbyId: string;
      address: string;
      name: string;
      color: string;
    }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join", ...p }),
      });
      if (!res.ok) throw new Error("join failed");
      return res.json();
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", lobbyId], next);
      broadcastLobby(next);
    },
  });

  const leave = useMutation({
    mutationFn: async (p: { lobbyId: string; address: string }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "leave", ...p }),
      });
      if (!res.ok) throw new Error("leave failed");
      return res.json();
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", lobbyId], next);
      broadcastLobby(next);
    },
  });

  const start = useMutation({
    mutationFn: async (p: { lobbyId: string; minPlayers?: number }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", ...p }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "start failed");
      }
      return res.json();
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", lobbyId], next);
      broadcastLobby(next);
    },
  });

  const advance = useMutation<
    LobbyState,
    Error,
    { lobbyId: string; address: string; amount?: number },
    { prev?: LobbyState }
  >({
    mutationFn: async (p: {
      lobbyId: string;
      address: string;
      amount?: number;
    }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "advance", ...p }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "advance failed");
      }
      return res.json();
    },
    // Optimistic update so the horse moves on every click immediately
    onMutate: async (p: {
      lobbyId: string;
      address: string;
      amount?: number;
    }) => {
      await qc.cancelQueries({ queryKey: ["race-lobby", lobbyId] });
      const prev = qc.getQueryData<LobbyState>(["race-lobby", lobbyId]);
      if (prev && prev.status === "running") {
        const next: LobbyState = {
          ...prev,
          players: prev.players.map((pl) =>
            pl.address.toLowerCase() === String(p.address).toLowerCase()
              ? { ...pl, clicks: pl.clicks + (Number(p.amount) || 1) }
              : pl
          ),
        };
        qc.setQueryData(["race-lobby", lobbyId], next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["race-lobby", lobbyId], ctx.prev);
    },
    onSuccess: (next: LobbyState) => {
      const prev = qc.getQueryData<LobbyState>(["race-lobby", lobbyId]);
      const merged = mergeMonotonic(prev, next);
      qc.setQueryData(["race-lobby", lobbyId], merged);
      broadcastLobby(merged);
    },
  });

  const reset = useMutation({
    mutationFn: async (p: { lobbyId: string }) => {
      const res = await fetch("/api/race/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset", ...p }),
      });
      if (!res.ok) throw new Error("reset failed");
      return res.json();
    },
    onSuccess: (next: LobbyState) => {
      qc.setQueryData(["race-lobby", lobbyId], next);
      broadcastLobby(next);
    },
  });

  return {
    lobby: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    create: create.mutateAsync,
    joinAny: joinAny.mutateAsync,
    join: join.mutateAsync,
    leave: leave.mutateAsync,
    start: start.mutateAsync,
    advance: advance.mutateAsync,
    reset: reset.mutateAsync,
  };
}
