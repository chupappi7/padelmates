/**
 * Game-level hierarchy for match hosting.
 * Ordered from highest to lowest: A > B1 > B2 > C1 > C2 > C3 > D
 */

// All valid level values in descending order (best → weakest)
export const LEVEL_HIERARCHY = ["A", "B1", "B2", "C1", "C2", "C3", "D"] as const;
export type GameLevel = (typeof LEVEL_HIERARCHY)[number];

// Main level groups
export const MAIN_LEVELS = ["A", "B", "C", "D"] as const;
export type MainLevel = (typeof MAIN_LEVELS)[number];

// Sub-levels per main level
export const SUB_LEVELS: Record<string, GameLevel[]> = {
  B: ["B1", "B2"],
  C: ["C1", "C2", "C3"],
};

// Rank index (lower = better)
const RANK: Record<string, number> = {};
LEVEL_HIERARCHY.forEach((l, i) => { RANK[l] = i; });

/** Get the rank of a level (lower = better). Returns Infinity for unknown. */
export function levelRank(level: string): number {
  return RANK[level] ?? Infinity;
}

/** Check if two levels are adjacent in the hierarchy (1 step apart). */
export function areAdjacent(a: string, b: string): boolean {
  return Math.abs(levelRank(a) - levelRank(b)) === 1;
}

/** Get the main level group for a sub-level */
export function mainLevelOf(level: string): MainLevel {
  if (level.startsWith("B")) return "B";
  if (level.startsWith("C")) return "C";
  return level as MainLevel;
}

/** All levels that belong to a main level */
export function levelsInGroup(main: MainLevel): GameLevel[] {
  if (main === "B") return ["B1", "B2"];
  if (main === "C") return ["C1", "C2", "C3"];
  return [main as GameLevel];
}

/**
 * Derive min_level and max_level from a set of selected levels.
 * Uses hierarchy ranking: lowest rank number = best = max_level, highest = weakest = min_level.
 */
export function deriveMinMax(selected: Set<string>): { min_level: string; max_level: string } {
  if (selected.size === 0) return { min_level: "D", max_level: "A" };
  
  let minRank = -1;
  let maxRank = Infinity;
  let minLevel = "A";
  let maxLevel = "D";

  selected.forEach((level) => {
    const r = levelRank(level);
    if (r > minRank) { minRank = r; minLevel = level; }
    if (r < maxRank) { maxRank = r; maxLevel = level; }
  });

  return { min_level: minLevel, max_level: maxLevel };
}

/**
 * Format a level range for display on badges/cards.
 * Same level → "B1". Different → "B1 – C2".
 */
export function formatLevelBadge(minLevel?: string | null, maxLevel?: string | null, fallbackSkillLevel?: number): string {
  // Fall back to legacy skill_level integer
  if (!minLevel && !maxLevel) {
    if (fallbackSkillLevel != null) {
      return ["D", "C", "B", "A"][fallbackSkillLevel - 1] ?? `${fallbackSkillLevel}`;
    }
    return "?";
  }

  const min = minLevel || "D";
  const max = maxLevel || "A";

  if (min === max) return min;
  // Show highest first: "B1 – C2"
  return `${max} – ${min}`;
}

/**
 * Expand min/max back into selected set for form state reconstruction.
 */
export function expandToSelected(minLevel?: string | null, maxLevel?: string | null): Set<string> {
  if (!minLevel || !maxLevel) return new Set<string>();

  const minR = levelRank(minLevel);
  const maxR = levelRank(maxLevel);
  const selected = new Set<string>();

  LEVEL_HIERARCHY.forEach((l) => {
    const r = levelRank(l);
    if (r >= maxR && r <= minR) {
      selected.add(l);
    }
  });

  return selected;
}
