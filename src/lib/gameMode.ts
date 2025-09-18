export type GameMode = "clicker" | "race";

const STORAGE_KEY_MODE = "game_mode";

export function parseMode(raw: string | null): GameMode | null {
  if (raw === "clicker" || raw === "race") return raw;
  return null;
}

export function getModeFromUrl(): GameMode | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const explicit = parseMode(params.get("mode"));
    if (explicit) return explicit;
    // If a lobby id is present in the URL, force race mode
    const hasLobby = !!params.get("lobby");
    if (hasLobby) return "race";
    return null;
  } catch {
    return null;
  }
}

export function loadStoredMode(): GameMode | null {
  try {
    return parseMode(
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY_MODE)
        : null
    );
  } catch {
    return null;
  }
}

export function persistMode(next: GameMode) {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, next);
  } catch {}
}
