import { NextRequest } from "next/server";
import { getActivePeerSet, upsertPresence } from "@/app/api/presence/state";
import { DEFAULT_RACE_THRESHOLD } from "@/lib/constants";

type Player = {
  address: string;
  name: string;
  color: string; // #RRGGBB
  clicks: number;
};

type Lobby = {
  id: string;
  status: "waiting" | "countdown" | "running" | "finished";
  players: Player[];
  capacity: number; // 2..10
  countdownEndsAt?: number; // ms epoch
  winner?: string; // address
  threshold: number;
  startedAt?: number;
  finishedAt?: number;
  createdAt: number;
};

const lobbies = new Map<string, Lobby>();

function createLobby(opts?: { capacity?: number; threshold?: number }) {
  const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  const capacity = Math.max(2, Math.min(10, Number(opts?.capacity) || 5));
  const threshold = Number(opts?.threshold) || DEFAULT_RACE_THRESHOLD;
  const lobby: Lobby = {
    id,
    status: "waiting",
    players: [],
    capacity,
    threshold,
    createdAt: Date.now(),
  };
  lobbies.set(id, lobby);
  return lobby;
}

function getLobby(id: string): Lobby | undefined {
  const lobby = lobbies.get(id);
  if (!lobby) return undefined;
  maybeAdvancePhase(lobby);
  return lobby;
}

function maybeAdvancePhase(lobby: Lobby) {
  if (
    lobby.status === "countdown" &&
    (lobby.countdownEndsAt || 0) <= Date.now()
  ) {
    lobby.status = "running";
    lobby.startedAt = Date.now();
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const lobby = getLobby(id);
    if (!lobby) return new Response("not found", { status: 404 });
    return Response.json(lobby);
  }
  // List lobbies (lightweight view)
  const list = Array.from(lobbies.values()).map((l) => ({
    id: l.id,
    status: l.status,
    players: l.players.length,
    capacity: l.capacity,
    createdAt: l.createdAt,
  }));
  return Response.json({ lobbies: list });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (action === "create") {
    const { capacity, threshold, address, name, color } = body || {};
    if (!address || !name || !color)
      return new Response("missing player", { status: 400 });
    const lobby = createLobby({ capacity, threshold });
    lobby.players.push({ address, name, color, clicks: 0 });
    upsertPresence(address, name, color);
    return Response.json(lobby);
  }

  if (action === "joinAny") {
    const { address, name, color } = body || {};
    if (!address || !name || !color)
      return new Response("missing player", { status: 400 });
    // Find first waiting lobby with space
    let target = Array.from(lobbies.values())
      .filter((l) => l.status === "waiting" && l.players.length < l.capacity)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!target) target = createLobby({});
    const key = String(address).toLowerCase();
    const player = target.players.find((p) => p.address.toLowerCase() === key);
    if (!player) target.players.push({ address, name, color, clicks: 0 });
    else {
      player.name = name;
      player.color = color;
    }
    upsertPresence(address, name, color);
    if (
      target.players.length >= target.capacity &&
      target.status === "waiting"
    ) {
      target.status = "countdown";
      target.countdownEndsAt = Date.now() + 3000;
    }
    return Response.json(target);
  }

  const { lobbyId } = body || {};
  if (!lobbyId) return new Response("missing lobbyId", { status: 400 });
  const lobby = getLobby(String(lobbyId));
  if (!lobby) return new Response("not found", { status: 404 });

  if (action === "join") {
    const { address, name, color } = body || {};
    if (!address || !name || !color)
      return new Response("missing fields", { status: 400 });
    if (lobby.status !== "waiting")
      return new Response("race already started", { status: 409 });
    if (lobby.players.length >= lobby.capacity)
      return new Response("lobby full", { status: 409 });
    const key = String(address).toLowerCase();
    const exists = lobby.players.find((p) => p.address.toLowerCase() === key);
    if (!exists) lobby.players.push({ address, name, color, clicks: 0 });
    else {
      exists.name = name;
      exists.color = color;
    }
    upsertPresence(address, name, color);
    if (lobby.players.length >= lobby.capacity && lobby.status === "waiting") {
      lobby.status = "countdown";
      lobby.countdownEndsAt = Date.now() + 3000;
    }
    return Response.json(lobby);
  }

  if (action === "leave") {
    const { address } = body || {};
    if (!address) return new Response("missing address", { status: 400 });
    lobby.players = lobby.players.filter(
      (p) => p.address.toLowerCase() !== String(address).toLowerCase()
    );
    if (lobby.players.length === 0) lobby.status = "waiting";
    return Response.json(lobby);
  }

  if (action === "start") {
    const { minPlayers } = body || {};
    // Allow the creator to enforce a minimum but cannot exceed capacity
    const required = Math.max(
      2,
      Math.min(Number(minPlayers) || 2, lobby.capacity)
    );
    // prune disconnected players once
    if (lobby.status === "waiting") {
      const active = getActivePeerSet();
      lobby.players = lobby.players.filter((p) =>
        active.has(p.address.toLowerCase())
      );
    }
    if (lobby.players.length < required)
      return new Response("not enough players", { status: 400 });
    if (lobby.status !== "waiting")
      return new Response("already started", { status: 409 });
    lobby.status = "countdown";
    lobby.countdownEndsAt = Date.now() + 3000;
    return Response.json(lobby);
  }

  if (action === "advance") {
    const { address, amount = 1 } = body || {};
    if (!address) return new Response("missing address", { status: 400 });
    maybeAdvancePhase(lobby);
    if (lobby.status !== "running")
      return new Response("race not running", { status: 409 });
    const p = lobby.players.find(
      (x) => x.address.toLowerCase() === String(address).toLowerCase()
    );
    if (!p) return new Response("not in lobby", { status: 404 });
    p.clicks += Number(amount) || 1;
    if (
      p.clicks >= lobby.threshold &&
      (lobby.status as string) !== "finished"
    ) {
      lobby.status = "finished";
      lobby.winner = p.address;
      lobby.finishedAt = Date.now();
    }
    return Response.json(lobby);
  }

  if (action === "reset") {
    lobby.status = "waiting";
    lobby.players = [];
    lobby.winner = undefined;
    lobby.startedAt = undefined;
    lobby.finishedAt = undefined;
    lobby.countdownEndsAt = undefined;
    return Response.json(lobby);
  }

  return new Response("unknown action", { status: 400 });
}
