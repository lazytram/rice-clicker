"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  const query = useQuery<LobbyState>({
    queryKey: ["race-lobby", lobbyId],
    queryFn: () => fetchLobby(lobbyId as string),
    refetchInterval: lobbyId ? 150 : false,
    staleTime: 75,
    enabled: !!lobbyId,
  });

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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["race-lobby", lobbyId] }),
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["race-lobby", lobbyId] }),
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["race-lobby", lobbyId] }),
  });

  const advance = useMutation({
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
      if (!res.ok) throw new Error("advance failed");
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
      return { prev } as { prev?: LobbyState };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["race-lobby", lobbyId], ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["race-lobby", lobbyId] }),
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["race-lobby", lobbyId] }),
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
