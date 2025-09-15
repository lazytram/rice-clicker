export type Presence = {
  address: string;
  name: string;
  color: string;
  ts: number;
};

export const PRESENCE_TTL_MS = 15_000;

// Lowercased address -> presence
export const peers = new Map<string, Presence>();

export function prune(now: number) {
  for (const [k, v] of peers) {
    if (now - v.ts > PRESENCE_TTL_MS) peers.delete(k);
  }
}

export function upsertPresence(
  address: string,
  name?: string,
  color?: string,
  now: number = Date.now()
) {
  const key = String(address).toLowerCase();
  const prev = peers.get(key);
  peers.set(key, {
    address,
    name: name ?? prev?.name ?? `Player ${key.slice(2, 6)}`,
    color: color ?? prev?.color ?? `#${key.slice(2, 8)}`,
    ts: now,
  });
  prune(now);
}

export function getActivePeers(now: number = Date.now()): Presence[] {
  prune(now);
  return Array.from(peers.values());
}

export function getActivePeerSet(now: number = Date.now()): Set<string> {
  prune(now);
  const s = new Set<string>();
  for (const p of peers.values()) s.add(p.address.toLowerCase());
  return s;
}
