

# Phase 1: Pre-fill Player Slots During Game Creation

## What It Does

When creating a "Find Players" game, hosts can type in the names of friends who are already joining. These appear as confirmed placeholder players on the game card and detail page, filling visual slots just like the WhatsApp emoji pattern ("1. Martin, 2. Petr, 3. Open, 4. Open").

## User Flow

```text
CREATE GAME (Find Players):
  "Looking for [2] out of [4] total"

  Pre-filled players (optional):
  +---------------------------+
  | Player 1: [Martin       ] |  <- text input
  | Player 2: [Petr         ] |  <- text input
  | + Add another             |
  +---------------------------+

  (Host is auto-counted as player if "playing")
  -> Result: 3/4 filled (host + Martin + Petr), 1 open slot
```

## How It Displays

- **GameCard**: Shows filled/open ratio correctly (e.g., "3/4 - 1 left")
- **GameDetailPage (Players tab)**: Pre-filled names appear as player cards with a generic avatar and a small "Guest" badge (no profile link). When a real user joins and fills the game, guest slots remain as-is.

## Technical Details

### Database

Add a `prefilled_players` column to the `games` table as a JSONB array storing name strings:

```sql
ALTER TABLE public.games
ADD COLUMN prefilled_players jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Example value: `["Martin", "Petr"]`

### File: `src/pages/Games/CreateGamePage.tsx`

1. Add `prefilledPlayers: string[]` to formData state (default `[]`).
2. Below the "Looking for X out of Y" selector, add a section titled "Players already joining" with:
   - Text inputs for each pre-filled name
   - An "+ Add player" button (max = `maxPlayers - lookingFor - (hostIsPlaying ? 1 : 0)`)
   - Remove button (X) on each input
3. Auto-calculate: `lookingFor = maxPlayers - prefilledPlayers.length - (hostIsPlaying ? 1 : 0)`
   - When a host adds a pre-filled player, `lookingFor` decreases automatically
   - The title updates: "Looking for 1 player" instead of "Looking for 2 players"
4. On submit, include `prefilled_players` as JSON in the insert payload.

### File: `src/pages/Games/EditGamePage.tsx`

1. Load `prefilled_players` from fetched game data, parse as `string[]`.
2. Same UI as create page for editing the pre-filled names.
3. On submit, include updated `prefilled_players`.

### File: `src/components/games/ParticipantsTab.tsx`

1. Accept new prop `prefilledPlayers: string[]`.
2. Render pre-filled names as PlayerCards with:
   - A generic avatar (first letter of name)
   - A "Guest" badge instead of "Host" or "Admin"
   - No role toggle or action buttons
3. Include them in the `totalConfirmed` count for the slot display.

### File: `src/components/games/GameCard.tsx`

1. Accept new prop `prefilledCount: number`.
2. Add `prefilledCount` to `currentPlayers` for the spots calculation.

### File: `src/pages/Games/GameDetailPage.tsx`

1. Read `prefilled_players` from the game data.
2. Pass it to `ParticipantsTab`.

### File: `src/pages/Games/GamesListPage.tsx` and `MyMatchesPage.tsx`

1. Read `prefilled_players` from the fetched games.
2. Calculate `prefilledCount` and pass to `GameCard`.

### Data Flow

```text
Host creates game:
  maxPlayers = 4
  hostIsPlaying = true  (counts as 1)
  prefilledPlayers = ["Martin", "Petr"]  (counts as 2)
  lookingFor = 1  (auto-calculated: 4 - 1 - 2)
  title = "Looking for 1 player"

GameCard shows:
  3/4 - 1 left  (host + 2 prefilled + 0 joined)

Players tab shows:
  [Host avatar] Host  |  [M] Martin (Guest)  |  [P] Petr (Guest)  |  [empty slot]
```

### Files Modified
1. Database migration (add `prefilled_players` column)
2. `src/pages/Games/CreateGamePage.tsx` -- pre-fill inputs + auto-calc lookingFor
3. `src/pages/Games/EditGamePage.tsx` -- same UI for editing
4. `src/components/games/ParticipantsTab.tsx` -- render guest cards
5. `src/components/games/GameCard.tsx` -- include in player count
6. `src/pages/Games/GameDetailPage.tsx` -- pass data through
7. `src/pages/Games/GamesListPage.tsx` -- fetch and pass prefilledCount
8. `src/pages/Games/MyMatchesPage.tsx` -- fetch and pass prefilledCount
