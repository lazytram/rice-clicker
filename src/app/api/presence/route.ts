import { NextRequest } from "next/server";
import { PRESENCE_TTL_MS, getActivePeers, upsertPresence } from "./state";

export async function GET() {
  const now = Date.now();
  return Response.json({
    active: getActivePeers(now),
    now,
    ttlMs: PRESENCE_TTL_MS,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { address, name, color } = body || {};
  if (!address) return new Response("missing address", { status: 400 });
  upsertPresence(address, name, color, Date.now());
  return Response.json({ ok: true });
}
