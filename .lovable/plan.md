
# Show Club + Admin on Game Cards

## Problem
When a game is club-hosted, the card currently shows either the club name OR the host name, but not both. You want it to display something like **"PadelKings · Bob Marley"** so users can see which club is hosting and which admin published it.

## Design Approach
Row 4 of the GameCard will show a **two-line host section** for club-hosted games:
- **Line 1**: Club logo (rounded square) + Club name (clickable, links to club page)
- **Line 2**: Small admin avatar + admin name in muted text, like "by Bob Marley"

For personal games, the current single-line layout stays unchanged.

```text
+------------------------------------------+
| PadelKings                               |
|  [club logo]  PadelKings                 |
|               by Bob Marley              |
+------------------------------------------+
```

## Technical Changes

### 1. GameCard props -- add club fields
Add optional `clubName`, `clubLogo`, and `clubId` props to `GameCardProps`. When present, Row 4 renders the two-line club+admin layout. The existing `hostName` and `hostAvatar` always represent the admin/user.

### 2. GamesListPage data fetching
Update `fetchGames` to always fetch the host profile. When `club_id` exists, also fetch the club data separately. Pass both to `GameCard`:
- `hostName` / `hostAvatar` = admin's profile (always)
- `clubName` / `clubLogo` / `clubId` = club data (only when club-hosted)

### 3. GameCard Row 4 rendering
When `clubName` is set:
- Club logo as a small rounded-square avatar (not circle)
- Club name as primary text (clickable link to `/clubs/{clubId}`)
- Below: "by {hostName}" in smaller muted text with the admin's tiny circular avatar

When `clubName` is not set:
- Current layout: circular avatar + host name (no changes)

### 4. MyMatchesPage consistency
Apply the same pattern to `MyMatchesPage.tsx` so club+admin info appears there too.

### Files Modified
- `src/components/games/GameCard.tsx` -- add club props, update Row 4 rendering
- `src/pages/Games/GamesListPage.tsx` -- fetch both club and host profile, pass both to GameCard
- `src/pages/Games/MyMatchesPage.tsx` -- same data fetching update
