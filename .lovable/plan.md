
## My Listings — Implementation Plan

### The Question: Where Does "My Listings" Live?

"My Listings" (court-sharing posts you've created) and "My Matches" (games you play in) are conceptually different:

- **My Matches** = games where you participate as a player, whether joined, hosted, or secured a court
- **My Listings** = court-sharing posts you created as the host (selling or giving away a court slot)

The current My Matches page already pulls in hosted games including court-sharing ones via `host_id = user.id`, which means court listings you posted are currently mixed into your match list — but they don't quite belong there since they aren't "matches" you're playing in.

**Recommendation: Add a 3rd tab "Listings" inside the existing My Matches page.**

Rationale:
- Keeps navigation simple (no new route or bottom tab needed)
- The page already has the tab structure ready (Upcoming / Past)
- Listings and Matches are related enough to live on the same page (both are your hosted activity)
- Avoids cluttering the bottom nav bar which is already at 5 items
- The tab label count badges make it instantly scannable

---

### Data Separation Logic

Currently the fetch mixes everything together. The new approach will split into two separate data sets:

**Matches** (Upcoming + Past tabs) = games where user participates but is NOT a court-sharing host:
- Is a player via `game_players`
- Has an accepted `join_requests` entry
- Is the host of a **non-court-sharing** game
- Has `court_taken_by = user.id` (secured someone else's court)

**Listings** tab = court-sharing games where `host_id = user.id` AND `payment_mode = 'court_sharing'`

This means a court listing you post shows up in **Listings**, not in **Matches**, which keeps both tabs clean and relevant.

---

### Technical Implementation

**`src/pages/Games/MyMatchesPage.tsx`**

1. Add a `listings` state array alongside `games`.
2. Split `fetchMyGames` into two fetches:
   - `fetchMyGames`: same as now but **exclude** games where `host_id = user.id AND payment_mode = court_sharing`
   - `fetchMyListings`: fetch games where `host_id = user.id AND payment_mode = court_sharing`
3. Update `getUserStatus` to handle the listings context (always returns `"hosting"` for listings tab)
4. Add a 3rd tab — `"listings"` — to the `TabsList`, changing the grid from `grid-cols-2` to `grid-cols-3`
5. Add `TabsContent value="listings"` with:
   - Active listings (date_time >= now) sorted ascending — shown first, since an "Available" listing is actionable
   - Expired/past listings (date_time < now) shown below with a subtle "Expired" section header
   - Each listing rendered with `GameCard` with `userStatus="hosting"` (orange accent, no role pill clutter)
   - Empty state: `Tag` icon + "No court listings" message with sub "Post a court to sell or give it away"
6. Rename page subtitle from "Games you've joined or hosted" to "Your matches and court listings"

**Tab layout (3-column)**:
```text
[ Upcoming (N) ]  [ Past (N) ]  [ Listings (N) ]
```

**Listings tab layout within the tab**:
- Active listings grouped under a subtle "Active" header (or no header if all active)
- Expired grouped under "Expired" in muted style
- Uses same `GameCard` component — court-sharing cards already show Available/Taken badge, price, no Lvl badge

---

### What Changes

| File | Change |
|------|--------|
| `src/pages/MyMatchesPage.tsx` | Add `listings` state, split fetch logic, add 3rd tab with listings content |

No new routes, no new components, no DB changes needed — everything is already in the data model.
