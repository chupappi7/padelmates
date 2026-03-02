

# Disable "Request & Pay" Join Mode

## What changes
Hide the "Request & Pay" join mode option from both the **Create Game** and **Edit Game** forms so it's not selectable until the full payment flow is ready.

## Files to modify

### 1. `src/pages/Games/CreateGamePage.tsx`
- Remove (or comment out) the "Request & Pay" button block (lines 998-1014) from the join mode selector
- Remove the validation check for `request_and_pay` price requirement (line 210-212) since the option won't be selectable

### 2. `src/pages/Games/EditGamePage.tsx`
- Remove the `request_and_pay` entry from the join mode options array (line 792)
- Remove the corresponding price validation check (line 152-153)

No database or backend changes needed -- the columns remain in place for when the feature is re-enabled later.

