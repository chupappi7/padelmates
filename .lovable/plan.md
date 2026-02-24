

## Redesign Confirmed Players — Scalable Row Layout

### Problem
The current grid of bordered boxes looks awkward at any player count. At 4 players it's a cramped 2x2 grid, and at 8 or 13+ players the boxes become tiny and cluttered. Empty slots as dashed boxes add visual noise.

### New Design
Replace the card grid with a **vertical list of horizontal rows** that scales cleanly from 4 to 13+ players:

```text
Confirmed Players                          3/8
-----------------------------------------------
[Avatar] Tomas K.        Host    Skill A
[Avatar] Maria G.                Skill B
[Avatar] Jan N.          Admin   Skill C
[  ?  ]  Open spot
[  ?  ]  Open spot
...
```

Each row is a compact horizontal flex item — avatar, name, role badge, skill badge — all inline. Works equally well for 4, 8, or 20 players.

### Specific Changes

**File: `src/components/games/ParticipantsTab.tsx`**

1. **Replace the grid container** (currently conditional `grid-cols-2` / `grid-cols-3`) with a simple vertical list using `space-y-1.5`

2. **Redesign `PlayerCard` from vertical card to horizontal row:**
   - Layout: `flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30`
   - Left: Avatar (h-8 w-8) with host/admin icon overlay
   - Middle: Name (text-sm, truncated) + role badge (Host/Admin/Guest) inline
   - Right: Skill badge pushed to far right with `ml-auto`
   - Host role toggle link stays below name if applicable

3. **Redesign empty slots** from dashed bordered boxes to minimal rows:
   - Same row height as player rows for visual consistency
   - Muted circle placeholder + "Open spot" text
   - Style: `flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/10 border border-dashed border-border/30`

4. **Remove the grid layout logic entirely** — no more conditional `grid-cols-2` vs `grid-cols-3`. One layout that works for any player count.

### What Does NOT Change
- Props interface — no changes
- Filter buttons (All / Requests) — no changes  
- Pending requests section — no changes (already uses horizontal rows)
- Accept/reject logic — no changes
- Empty state — no changes
- All existing role toggle, host badge, admin badge, guest badge functionality preserved

### Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Layout | Grid of bordered boxes | Vertical list of rows |
| Scaling | Awkward at different counts | Clean at any count |
| Empty slots | Dashed bordered boxes | Subtle muted rows |
| Player info | Stacked vertically in card | Inline horizontal row |
| Readability | Names truncated in tiny boxes | Full names visible |

