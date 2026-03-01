

## Club Detail Page UI/UX Improvements

### Issues to Fix

**1. Stats bar horizontal scrolling**
The three stat pills (Members, Matches, Upcoming) shift sideways on smaller screens. Fix by making them `flex-wrap` or switching to a grid layout so they stay in place and never scroll horizontally.

**2. Avatar fallback transparency**
The club logo fallback uses `bg-primary/10` which appears nearly transparent on the dark theme. Change to a solid background color (e.g., `bg-card` or `bg-[hsl(220,25%,18%)]`) so the letter is always visible on a solid surface.

**3. Add Edit button for admins/owners**
Place a small "Edit" or pencil icon button near the club name or in the action bar that opens the existing Admin Panel directly to the Settings tab. Only visible to admins/owners.

**4. Show "Owned by" info on the main page**
Below the club name and location, add a small clickable row showing the owner's avatar and name (e.g., "Owned by John"). Tapping navigates to their profile. This gives immediate context about who runs the club.

**5. General UX polish**
- Add a short description snippet (1-2 lines) below the owner row on the main header, so users get context without switching to the About tab.
- Make stats bar use compact `text-xs` sizing so all three fit comfortably on mobile.

---

### Technical Details

**File: `src/pages/Clubs/ClubDetailPage.tsx`**

- Fetch owner profile (name, avatar_url) alongside the club data in `fetchClub()`.
- Stats bar: change container from `flex gap-3` to `flex flex-wrap gap-2` and reduce pill padding (`px-2.5 py-1 text-xs`).
- Avatar: change fallback from `bg-primary/10` to `bg-card border border-border` for a solid, non-transparent look.
- Add owner row: a small `div` with avatar + "Owned by {name}" after the location, clickable to `/user/{owner_id}`.
- Add description preview: if `club.description` exists, show 2-line clamp below the owner row.
- Add Edit button: next to the Settings gear (or replace it), an edit pencil icon that opens admin panel. Only shown for `isAdmin`.

**File: `src/components/clubs/ClubFeedTab.tsx`** - No changes needed.

**File: `src/components/clubs/ClubAboutTab.tsx`** - No changes needed.

