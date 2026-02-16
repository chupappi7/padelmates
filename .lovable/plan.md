

# Simplify Price to "Total Court Price + Auto Split"

## What Changes

Across all game creation flows (Find Players, Americano, etc.) and the Edit Game page, replace the current price inputs with a single **optional** "Total Court Price" field. When filled in, it auto-splits across `maxPlayers` and shows the per-player amount. When left empty, the game is free.

The price field becomes **required only** when the join mode is set to "Request and Pay".

## Current vs New Behavior

```text
CURRENT (Find Players):
- Total Amount input + Per Player read-only display (already split logic)
- But "Sell Court" flow has a separate "Price for the Court" field
- Edit page has a plain "Price per Player" input with no split

NEW (All flows):
- One optional field: "Total Court Price" (Kč)
- Auto-calculated label: "X Kč per player" (based on maxPlayers)
- If empty/0: shows "Free"
- Required only when joinMode = "request_and_pay"
```

## Technical Details

### File: `src/pages/Games/CreateGamePage.tsx`

1. **Sell Court flow (lines 269-286)**: Replace "Price for the Court" input (which currently saves to `pricePerPlayer`) to use `totalPrice` field instead, with per-player split display below.

2. **Regular flow price section (lines 516-546)**: Already has total + split UI -- keep this as-is, it's already correct.

3. **Submission logic (lines 127-129)**: Unify -- always compute `price_per_player` as `Math.ceil(totalPrice / maxPlayers)`. Remove the `pricePerPlayer` field from formData entirely since everything goes through `totalPrice`.

4. **Validation**: When `joinMode === "request_and_pay"`, require `totalPrice > 0` before submit. Show toast error if missing.

### File: `src/pages/Games/EditGamePage.tsx`

1. **Replace the current "Price per Player" input** (lines ~210-225) with the same "Total Court Price" + auto-split UI used in CreateGamePage.

2. **On load**: Reverse-calculate `totalPrice` from `price_per_player * max_players` when fetching existing game data.

3. **On submit**: Calculate `price_per_player = Math.ceil(totalPrice / maxPlayers)`.

4. **Add same validation**: Require price when `joinMode === "request_and_pay"`.

### FormData Changes

- Remove `pricePerPlayer` field from both pages
- Use `totalPrice` as the single price input field everywhere
- Default to empty string (optional/free)

