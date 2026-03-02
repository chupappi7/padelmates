
# Profile Page Redesign + Match History Page

## Overview

Restructure the profile pages to be clean and minimal, add a "preferred position" field, and create a dedicated Match History page with infinite scroll and privacy controls.

## Database Changes

### Add `preferred_position` column to `profiles`
- New nullable text column: `preferred_position` (values: `'left'`, `'right'`, or null)
- No RLS changes needed -- existing profile policies cover it

## Profile Page Changes (`ProfilePage.tsx`)

### Clean up the self-profile view
**Keep visible:**
- Profile photo (avatar)
- Display name
- Skill level badge
- PDR Rating (in hero card, as-is)
- Location/city (from `region`)
- Preferred position (new field, editable)
- Gender: M (blue) / F (pink) -- display only, from signup
- Age: calculated from `birth_year`, leave blank if not set
- "Match History" button linking to `/match-history`

**Remove from profile page:**
- PerformanceStats card (matches/wins/losses/win%) -- this moves to Match History page
- PastMatches component (replaced by full Match History page)

**Add to edit form:**
- Preferred Position selector (Left side / Right side)

### Restructure Personal Details card
Consolidate into a single clean info card below hero:
- Location (region)
- Preferred Position: "Left" or "Right" (or empty)
- Sex: M (blue) / F (pink)
- Age: from birth_year (or empty)
- No email shown (keep private)

### Add Match History button
- A button at the bottom of the profile info that navigates to `/match-history` (self) or `/match-history/:userId` (others)

## Public Profile Page Changes (`UserProfilePage.tsx`)

### Clean up the public profile view
**Keep visible:**
- Profile photo, name, skill level, PDR rating (hero card)
- Location, preferred position, sex, age (same Personal Details card)
- Action buttons (message, add friend)
- Clubs
- "Match History" button

**Remove:**
- PerformanceStats card (summary view is in Match History)

## New Match History Page (`src/pages/Profile/MatchHistoryPage.tsx`)

### Route: `/match-history` (self) and `/match-history/:userId` (other user)

### Data fetched:
- All completed matches for the user via `match_players` + `matches` + `games`
- Opponent names via `match_players` joined with `profiles`
- Match type from `games.format` (casual_match / competitive)

### Each row displays:
- **Self viewing own history:** date, opponent names, result (W/L badge), score, match type tag
- **Others viewing:** date, opponent names, result (W/L) only -- no score shown

### Infinite scroll:
- Load 20 matches at a time
- Use cursor-based pagination (offset with `created_at` ordering)
- "Load more" trigger at bottom via intersection observer

### Layout:
- Back button at top
- Player name as header
- List of match rows in the same card style as existing PastMatches component

## Technical Details

**New migration:** Add `preferred_position` text column to profiles (nullable)

**Files to create:**
- `src/pages/Profile/MatchHistoryPage.tsx` -- new page with infinite scroll match list

**Files to modify:**
- `src/App.tsx` -- add routes `/match-history` and `/match-history/:userId`
- `src/pages/Profile/ProfilePage.tsx` -- add preferred position to edit form and Personal Details card, remove PerformanceStats, add Match History button
- `src/pages/Profile/UserProfilePage.tsx` -- fetch extra profile fields (region, sex, birth_year, preferred_position), add Personal Details card, remove PerformanceStats, add Match History button

**Existing file to keep but no longer import inline:**
- `src/components/profile/PastMatches.tsx` -- logic reused in MatchHistoryPage
- `src/components/profile/PerformanceStats.tsx` -- removed from profile pages (stats live in match history now)
