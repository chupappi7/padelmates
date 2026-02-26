

## Replace Messages Tab with ELO Hub

Replace the "Messages" bottom tab with a new "ELO" tab that contains three sub-tabs: **Stats**, **Submit Score**, and **Forecast**.

### Overview

The new `/elo` route will be a single page with horizontal tab navigation at the top, providing a competitive stats hub for padel players.

### Tab 1: Stats (default)

- Player name and current ELO rating displayed prominently at the top
- ELO trend chart (line chart using Recharts, already installed) showing rating over time
- Match history list sorted latest first, each row showing:
  - Date, opponent names, score
  - ELO change (+/- with green/red coloring)

### Tab 2: Submit Score

- Form to submit a match result:
  - Select 4 players (2v2) from a searchable player list (profiles table)
  - Enter set scores using existing ScoreScrollPicker component
  - Submit button that records the match and triggers ELO calculation

### Tab 3: Forecast

- Select 4 players (2v2) from searchable player list
- Display predicted win probability and expected ELO gain/loss for each team
- Uses standard ELO formula (K-factor based calculation) -- computed client-side, no API needed

### Database Changes

1. **Add `elo_rating` column to `profiles` table** (integer, default 1200)
2. **Create `elo_history` table** to track rating changes over time:
   - `id` (uuid, PK)
   - `user_id` (uuid, NOT NULL)
   - `match_id` (uuid, nullable -- links to matches table)
   - `old_rating` (integer)
   - `new_rating` (integer)
   - `created_at` (timestamptz)
   - RLS: users can read all history (public leaderboard), only system inserts

### File Changes

1. **`src/pages/Elo/EloPage.tsx`** -- New page with three tabs (Stats, Submit, Forecast)
2. **`src/components/elo/StatsTab.tsx`** -- ELO chart + match history
3. **`src/components/elo/SubmitScoreTab.tsx`** -- Score submission form
4. **`src/components/elo/ForecastTab.tsx`** -- Player selector + ELO prediction
5. **`src/lib/elo.ts`** -- ELO calculation utility functions (compute new ratings, forecast)
6. **`src/components/layout/BottomTabBar.tsx`** -- Replace Messages tab with ELO tab (Trophy icon, path `/elo`)
7. **`src/App.tsx`** -- Add `/elo` route

### ELO Calculation

Standard formula with K=32:
- Expected score: `E = 1 / (1 + 10^((opponent_rating - player_rating) / 400))`
- New rating: `R' = R + K * (actual - expected)`
- For doubles: average team ratings for the calculation

Messages will remain accessible from the top navbar or profile, just removed from the bottom tab bar.

