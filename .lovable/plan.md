
## Simplify Pricing UI for "Find Players"

### What changes

Replace the current two-button toggle (Split among players / Per player) with a cleaner flow:

1. **Label**: "Price (optional)" instead of "Price"
2. **Default input**: labeled "Full Court Price" -- user types total court cost, and the per-player amount is auto-calculated and shown as read-only text below (not an editable field)
3. **Toggle**: A small "Set price per player instead" link/button below. When tapped, the input switches to a direct per-player entry (label changes to "Price per Player"), and the auto-calculation text disappears
4. **Empty = free**: If user leaves the field empty, price defaults to 0

### UI Layout

```text
Price (optional)
[Full Court Price]  /  [Per Player]   <-- two-tab toggle, simpler labels

Input:  Kc [________]
        placeholder: "e.g., 800" or "e.g., 200"

Below input (full court mode, when value entered):
  "800 Kc / 4 players = 200 Kc per player"

Below input (per player mode, when value entered):
  "200 Kc per player"

Below input (empty):
  "Leave empty for free"
```

### Technical Details

**File**: `src/pages/Games/CreateGamePage.tsx` (lines 1000-1055)

- Change label from `"Price"` to `"Price (optional)"`
- Rename toggle buttons: "Full Court Price" and "Per Player" (keep the same `priceMode` values `split_evenly` / `set_price`)
- Update placeholder text: `"e.g., 800"` for split mode, `"e.g., 200"` for per-player mode
- In per-player mode, the input is still editable (user types the per-player price directly)
- In full court mode, the per-player calculation displays as read-only text below
- Update empty-state helper text to `"Leave empty for free"`
- No changes to submit logic (already handles both modes correctly)
