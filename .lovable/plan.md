
# Reorder Bottom Tab Bar and Update Host Button Color

## Summary
Reorder the mobile bottom tab bar to: **Matches | Clubs | Host | My Matches | PDR**, replacing Profile with Clubs. Change the Host FAB button from coral (secondary) to teal (primary) for visual consistency. Update the desktop navbar to match by adding Clubs.

## Changes

### 1. `src/components/layout/BottomTabBar.tsx`
- Update the `tabs` array to the new order:
  1. Matches (`/`, Home icon)
  2. Clubs (`/clubs`, Building2 icon)
  3. Host (FAB, Plus icon)
  4. My Matches (`/my-matches`, CalendarCheck icon)
  5. PDR (`/elo`, Trophy icon)
- Remove Profile tab (already accessible from top navbar avatar menu)
- Change Host FAB colors from `bg-secondary` / `text-secondary` to `bg-primary` / `text-primary` (teal)
- Update icon imports: swap `User` for `Building2`, remove unused imports

### 2. `src/components/layout/Navbar.tsx`
- Add Clubs (`/clubs`, Building2 icon) to the `desktopNavLinks` array so desktop stays in sync
- Final desktop nav links: **Clubs | My Matches | PDR** (Matches via logo click)

No other files need changes -- the `/clubs` route and `ClubsListPage` already exist.
