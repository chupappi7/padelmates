

## Plan: Redesign Score Picker with Team Labels Flanking the Score

The current layout stacks "Team 1" and "Team 2" labels above their respective scroll columns. The user wants team labels on the left and right sides of the score area for a cleaner, more intuitive UI.

### New Layout

```text
┌─────────────────────────────────┐
│          Set Score              │
│    [Set 1] [Set 2] [+]         │
│                                 │
│  Team 1    [4] - [6]    Team 2  │
│  (label)   scrollers   (label)  │
│                                 │
│       Remove Set 1              │
│       4-6 / 6-3                 │
│       Sets: 1 - 1               │
│     [ Confirm Score ]           │
└─────────────────────────────────┘
```

### Changes (single file: `ScoreScrollPicker.tsx`)

1. **Remove the separate header row** (lines 202-206) with Team 1/Team 2 labels above the columns.

2. **Restructure the picker row** (lines 207-225) to be a single flex row with 5 elements:
   - `Team 1` label (vertical text or small horizontal label, left-aligned)
   - Score scroll column (Team 1)
   - Dash separator
   - Score scroll column (Team 2)
   - `Team 2` label (right-aligned)

3. **Widen the dialog** slightly from `max-w-[320px]` to `max-w-[360px]` to accommodate the side labels comfortably.

4. Team labels will use `text-[11px] font-bold uppercase tracking-wider text-muted-foreground` and be vertically centered alongside the scroll columns using `items-center`.

