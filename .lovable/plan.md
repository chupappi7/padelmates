

## Level Picker UX Redesign

### Problem
The current two-step picker (main levels → sub-levels) allows arbitrary multi-select, creating invalid wide ranges like B1-C3. Users need a constrained, intuitive single-interaction picker.

### Design: Connected Linear Strip

Replace the current picker with a single horizontal bar showing all 7 levels in order. Selection works by tapping to anchor, then optionally tapping one adjacent neighbor to form a range.

```text
┌───┬────┬────┬────┬────┬────┬───┐
│ A │ B1 │ B2 │ C1 │ C2 │ C3 │ D │
└───┴────┴────┴────┴────┴────┴───┘
         ▓▓▓▓▓▓▓▓▓▓
         B2 ────── C1   (range of 2)

  Shortcuts:  [All B]  [All C]
```

**Interaction rules:**
- **Tap a level** → selects it as single (clears previous)
- **Tap an adjacent level** when one is already selected → expands to a 2-cell range
- **Tap a non-adjacent level** → moves selection there (replaces, does not create wide range)
- **Tap inside an active range** → collapses to that single level
- **Shortcut pills** "All B" and "All C" below the strip → select B1-B2 or C1-C3 respectively

**Valid outcomes:**
- Single: A, B1, B2, C1, C2, C3, D
- Adjacent pair: A–B1, B1–B2, B2–C1, C1–C2, C2–C3, C3–D
- Shortcut group: B (B1–B2), C (C1–C3)

This naturally prevents wide ranges — you can never select more than 1 step from your anchor in sub-level mode, or use the preset shortcuts for main-level groups.

### Visual style
- Levels rendered as a connected segmented bar (no gaps, rounded ends only on first/last)
- Selected range gets `bg-primary text-primary-foreground` fill with connected highlight
- Unselected segments: subtle border, muted text
- Disabled/unreachable segments (more than 1 step from selection edges) get reduced opacity
- Shortcut pills below: small rounded chips, highlight when their range matches current selection

### Files to change
1. **`src/components/games/LevelRangePicker.tsx`** — full rewrite with new strip-based UI and constrained logic
2. **`src/lib/levelUtils.ts`** — add `areAdjacent(a, b)` helper; existing `deriveMinMax`, `formatLevelBadge`, `expandToSelected` remain unchanged
3. No changes to `CreateGamePage`, `EditGamePage`, or any other consumer — the `onChange(minLevel, maxLevel)` API stays the same

