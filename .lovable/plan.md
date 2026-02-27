

# Add Club Filter -- Scrollable Chip Bar

## Problem
Three side-by-side dropdowns won't fit on mobile. We need a space-efficient way to add club filtering.

## Approach: Horizontal Chip/Pill Bar

Instead of a third dropdown, add a **horizontally scrollable chip bar** below the existing Type + Level filters. This only appears when the user is logged in and has joined at least one club.

```text
[ Type v ] [ Level v ]
[ All ] [ My Clubs ] [ PadelKings ] [ Smash FC ] ...
          ^^^ scrollable chip row ^^^
```

- Chips are small pill buttons (like the DayPicker style)
- "All" is selected by default (no club filtering)
- "My Clubs" filters to any game from a joined club
- Individual club names let you drill into one specific club
- The row scrolls horizontally with `overflow-x-auto` and hidden scrollbar
- When no user is logged in or user has no clubs, this row is hidden entirely

## Technical Changes

### 1. GamesListPage.tsx

**New state:**
- `clubFilter`: string -- `"all"`, `"my_clubs"`, or a specific club ID
- `userClubs`: array of `{ id: string; name: string }` -- fetched from `club_followers` joined with `clubs`

**New data fetch (inside existing `useEffect`):**
- When `user` exists, query `club_followers` (status = active) for user's clubs, then batch-fetch club names from `clubs` table

**Filter logic update in `filteredGames`:**
- `"all"` -- no club filter applied
- `"my_clubs"` -- `game.club_id` must be in `userClubs` IDs
- specific ID -- `game.club_id === clubFilter`

**UI addition:**
- After the Type + Level filter row, render a scrollable `div` with chip buttons
- Each chip uses conditional styling (filled primary when active, outline when inactive)
- Same layout for both mobile and desktop -- chips naturally adapt

### Files Modified
- `src/pages/Games/GamesListPage.tsx` -- add club chip bar, state, fetch, and filter logic

