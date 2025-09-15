// Centralized Japan-themed emoji list and helpers for tiered selection

export const TIER_SIZE = 1000;

export const JAPAN_EMOJIS: string[] = [
  "🍙", // onigiri
  "🍚", // rice
  "🍘", // senbei
  "🍢", // oden
  "🍥", // narutomaki
  "🍜", // ramen
  "🍣", // sushi
  "🍱", // bento
  "🍤", // tempura
  "🍛", // curry
  "🍡", // dango
  "🍵", // tea
  "🍶", // sake
  "🥢", // chopsticks
  "🏮", // lantern
  "⛩️", // torii
  "🎴", // hanafuda
];

export type EmojiTierInfo = {
  emoji: string;
  tierIndex: number;
  rangeStart: number; // inclusive
  rangeEnd: number; // inclusive
};

export function getEmojiForGlobalCount(totalClicks: number): EmojiTierInfo {
  const safeTotal = Math.max(0, Math.floor(Number(totalClicks) || 0));
  const absoluteTier = Math.floor(safeTotal / TIER_SIZE);
  const index = absoluteTier % JAPAN_EMOJIS.length;
  const rangeStart = absoluteTier === 0 ? 0 : absoluteTier * TIER_SIZE + 1;
  const rangeEnd = (absoluteTier + 1) * TIER_SIZE;
  return {
    emoji: JAPAN_EMOJIS[index],
    tierIndex: absoluteTier,
    rangeStart,
    rangeEnd,
  };
}
