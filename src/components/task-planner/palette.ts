export const MEMBER_PALETTE = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
  "#84CC16", // lime
  "#06B6D4", // cyan
  "#A855F7", // purple
] as const;

export function pickNextColour(usedColours: string[]): string {
  const used = new Set(usedColours.map((c) => c.toLowerCase()));
  for (const c of MEMBER_PALETTE) {
    if (!used.has(c.toLowerCase())) return c;
  }
  return MEMBER_PALETTE[usedColours.length % MEMBER_PALETTE.length];
}

export function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0b0f1a" : "#ffffff";
}
