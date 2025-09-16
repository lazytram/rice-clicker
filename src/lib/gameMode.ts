export type GameMode = "clicker" | "race";

const STORAGE_KEY_MODE = "game_mode";

export function parseMode(raw: string | null): GameMode | null {
  if (raw === "clicker" || raw === "race") return raw;
  return null;
}

export function getModeFromUrl(): GameMode | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return parseMode(params.get("mode"));
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
