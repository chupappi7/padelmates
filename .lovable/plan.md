

## Improved Set Score Display

The current vertical stacking of individual set scores (7·6, 4·6, 6·3) above the big sets-won number works but feels disconnected and takes up vertical space. Here's a cleaner approach inspired by professional sports scoreboards:

### Design: Horizontal Set Score Pills

Replace the vertically stacked mini-scores with a **horizontal row of compact pill badges** below the main sets-won score. Each pill shows one set result (e.g., `7-6`) with the winner's score highlighted in green.

**Layout (top to bottom):**
1. Main sets-won score: **2 - 1** (large, bold)
2. "SETS" label (tiny, muted)
3. Row of set pills: `[7-6]` `[4-6]` `[6-3]` (small rounded badges, inline)
4. Edit button

This is more compact, reads left-to-right naturally (Set 1, Set 2, Set 3), and scales well whether there are 1, 2, or 3 sets.

### Technical Details

**File: `src/components/games/MatchesTab.tsx`**

- Move the set scores from **above** the main score to **below** the "SETS" label
- Render each set as a small rounded pill/badge with `bg-muted` background
- Inside each pill: show `t1-t2` with the winning side's number in `text-success`
- Use `flex-wrap` so it handles 3 sets gracefully on narrow screens

