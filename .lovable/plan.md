
## Fix: Court Selling Price — Full Price, Not Split

### Problem Summary

The "Sell / Give Away Court" flow has three bugs that prevent the price from working correctly:

**Bug 1 — Wrong price calculation on save**
The form saves `price_per_player = Math.ceil(totalPrice / maxPlayers)` — this is the "split evenly" formula used for regular matches. For a court sale, the buyer pays the **full listed price**, not a fraction of it.

**Bug 2 — Wrong price_mode default**
`formData.priceMode` is initialised to `"free"` for `sell_court`. The `GameCard` checks `priceMode !== "free"` before showing the price, so even if a price is entered it never appears on the card.

**Bug 3 — Misleading helper text**
The price field shows "X Kč per player (split across Y)" — confusing for a court sale. It should show the total asking price clearly.

---

### What the fix looks like

```text
BEFORE (find_players):
  Input: 400 Kč total  →  saved as 100 Kč/player (÷ 4)  →  card shows 100 Kč  ✓

BEFORE (sell_court — broken):
  Input: 400 Kč total  →  saved as 100 Kč/player (÷ 4)  →  card hides price (priceMode=free)  ✗

AFTER (sell_court — fixed):
  Input: 400 Kč        →  saved as 400 Kč (full price)  →  card shows 400 Kč  ✓
  Input: 0 Kč          →  saved as 0 Kč                  →  card shows "Free"  ✓
```

---

### Technical Changes

**File: `src/pages/Games/CreateGamePage.tsx`**

1. **`formData.priceMode` initial value** — change `sell_court` default from `"free"` to `"set_price"`:
   ```typescript
   // Line 93 — before:
   priceMode: hostType === "find_players" ? "split_evenly" : "free"
   
   // After:
   priceMode: hostType === "find_players" ? "split_evenly"
            : hostType === "sell_court"  ? "set_price"
            : "free"
   ```

2. **`price_per_player` calculation on submit** — for `sell_court`, store the raw input price instead of dividing:
   ```typescript
   // Before (line 167-169):
   price_per_player: formData.totalPrice && Number(formData.totalPrice) > 0
     ? Math.ceil(Number(formData.totalPrice) / formData.maxPlayers)
     : 0,
   
   // After:
   price_per_player: formData.totalPrice && Number(formData.totalPrice) > 0
     ? isSellCourt
       ? Number(formData.totalPrice)                              // full price for court sale
       : Math.ceil(Number(formData.totalPrice) / formData.maxPlayers) // split for matches
     : 0,
   ```

3. **Helper text below the price input** — update the hint to be accurate for court sales:
   ```tsx
   // Before:
   <p>…{Math.ceil(…/ formData.maxPlayers)} Kč per player (split across {formData.maxPlayers})</p>
   
   // After:
   <p>Asking price: {Number(formData.totalPrice)} Kč — shown on listing card</p>
   ```

No database schema changes needed. No new migrations required.

**File: `src/components/games/GameCard.tsx`** — No changes needed. The card already shows the price correctly when `pricePerPlayer > 0 && priceMode !== "free"`. Once `price_mode` is saved as `"set_price"` and `price_per_player` is the full amount, the card will display it automatically.
