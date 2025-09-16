"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Peer = { address: string; name: string; color: string; ts: number };

async function fetchPresence(): Promise<{
  active: Peer[];
  now: number;
  ttlMs: number;
}> {
  const res = await fetch("/api/presence", { cache: "no-store" });
  if (!res.ok) throw new Error("presence fetch failed");
  return res.json();
}

export function usePresence({
  address,
  name,
  color,
}: {
  address?: string | null;
  name?: string;
  color?: string;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["presence"],
    queryFn: fetchPresence,
    refetchInterval: 2000,
    staleTime: 1000,
  });

  const heartbeat = useMutation({
    mutationFn: async () => {
      if (!address) return;
      await fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, name, color }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presence"] }),
  });

  useEffect(() => {
    if (!address) return;
    heartbeat.mutate();
    const id = window.setInterval(() => heartbeat.mutate(), 5000);
    return () => window.clearInterval(id);
  }, [address, name, color, heartbeat]);

  return {
    peers: query.data?.active ?? [],
    ttlMs: query.data?.ttlMs ?? 0,
    refresh: query.refetch,
  };
}
