

# Add "Split Evenly" Price Option

## What It Does

Add a "Split Evenly" toggle to the price section. When enabled, the host skips entering a specific price -- the game just shows a label like "Split evenly" to signal players that the court cost will be shared equally. The host can still optionally enter a total price for transparency, but it's not required.

## UI Layout

```text
Price:
  [x] Split evenly     [ ] Free     [ ] Set price

  (If "Split evenly" selected)
  -> Shows: "Players will split the court cost evenly"
  -> Optional: Total Court Price input (collapsed/optional)

  (If "Free" selected)
  -> No price input shown

  (If "Set price" selected)
  -> Total Amount input + Per Player calculated display (current behavior)
```

## How It Works

- **Split Evenly (default for Find Players)**: Signals to joining players that costs will be shared. No price input required. Optionally, the host can still enter a total to show the per-player estimate.
- **Free**: No cost at all. Current behavior when price is 0/empty.
- **Set Price**: Current behavior -- host enters total, per-player is auto-calculated.

## Technical Details

### Database

- Add a `price_mode` column to the `games` table with values: `'split_evenly'`, `'free'`, `'set_price'` (default `'free'`).
- Migration: `ALTER TABLE games ADD COLUMN price_mode text NOT NULL DEFAULT 'free' CHECK (price_mode IN ('split_evenly', 'free', 'set_price'));`

### File: `src/pages/Games/CreateGamePage.tsx`

1. Add `priceMode` to formData state (default `'free'`, or `'split_evenly'` for `find_players` host type).
2. Replace the current price section with 3 toggle chips: "Split evenly", "Free", "Set price".
3. Conditionally render price input only when `priceMode === 'set_price'`, or optionally when `priceMode === 'split_evenly'`.
4. On submit, include `price_mode` in the insert payload. When `priceMode === 'split_evenly'` and no total entered, set `price_per_player` to 0.

### File: `src/pages/Games/EditGamePage.tsx`

1. Same UI changes -- add price mode chips.
2. Load `price_mode` from fetched game data.
3. On submit, include `price_mode` in the update payload.

### File: `src/components/games/GameCard.tsx` (and GameDetailPage)

1. When `price_mode === 'split_evenly'` and `price_per_player === 0`, show a badge/label like "Split evenly" instead of "Free".
2. When `price_mode === 'split_evenly'` and `price_per_player > 0`, show the per-player amount with a "split" indicator.

### Files Modified
1. Database migration (add `price_mode` column)
2. `src/pages/Games/CreateGamePage.tsx`
3. `src/pages/Games/EditGamePage.tsx`
4. `src/components/games/GameCard.tsx` -- display logic
5. `src/pages/Games/GameDetailPage.tsx` -- display logic

