

## Plan: Rewrite EditGamePage to match CreateGamePage form structure

The current `EditGamePage` has a significantly different and outdated form layout compared to `CreateGamePage`. The create page has distinct flows per host type (find_players, americano, sell_court, sell_spots) with modern card-based layouts, spots-needed stepper, game type selector, and proper join mode/price sections. The edit page uses an older generic layout that doesn't match.

### Approach

**Rewrite `EditGamePage.tsx`** to mirror the `CreateGamePage` form UI while keeping edit-specific logic (fetching existing game data, updating instead of inserting).

Key changes:

1. **Detect host type from saved game data** -- Map `payment_mode` and `format` back to `HostType` during fetch:
   - `court_sharing` → `sell_court`
   - `spot_selling` → `sell_spots`
   - `americano`/`team_americano` format → `americano`
   - Otherwise → `find_players`

2. **Add missing state** -- Add `spotsNeeded`, `gameType`, `customGameType`, `allowSubstitutions`, `userClubs`, `hostingAs` state variables matching create page.

3. **Replace the form JSX** -- Use the exact same card-based layout from CreateGamePage for each host type:
   - **Find Players**: Type of Game card → Location & Schedule card → Players card (with stepper) → Skill Level card → How to Join card (join mode + price + visibility)
   - **Americano**: Location & Schedule → Players (with stepper + substitutions toggle) → Skill Level & Settings (visibility, price) → About Tournament
   - **Sell Court**: Court Details card (location, date, time, duration, price, note, booking screenshot)
   - **Sell Spots**: Location & Schedule → Details → Price

4. **Derive values identically** -- Use the same `spotsNeeded`/`derivedMaxPlayers`/`clampedSpotsNeeded` logic from CreateGamePage.

5. **Update `fetchGame`** -- Populate all new state from saved game data (reverse-engineer `spotsNeeded` from `max_players - prefilled - hostIsPlaying`, detect `gameType` from title pattern, load `allowSubstitutions`).

6. **Update `handleSubmit`** -- Match the create page's title generation and price calculation logic per host type.

### Files to modify

- `src/pages/Games/EditGamePage.tsx` -- Full rewrite of form body and state management to match CreateGamePage patterns.

