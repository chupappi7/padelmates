

## Plan: Unify Match History Cards with Game Match Card UI

The match history page currently uses a vertical list layout (user team → VS divider → opponents) while the in-game MatchesTab uses a side-by-side layout (Team 1 avatars | Score | Team 2 avatars). The goal is to make match history cards match the game scorecard style.

### Changes

**`src/pages/Profile/MatchHistoryPage.tsx`** — Rewrite the `MatchCard` component:

1. Replace the vertical layout with the side-by-side 3-column layout from MatchesTab:
   - **Left column** (right-aligned): User + partner names with avatars on inner edge
   - **Center**: Score (e.g. `6 – 4`) with "GAMES" label below, winner score highlighted in success color
   - **Right column** (left-aligned): Opponents with avatars on inner edge

2. Fetch avatar URLs alongside player names (currently only fetching `name` from profiles — need to also select `avatar_url`)

3. Keep the match type badge in the card header, and the W/L trophy/X icon as a small indicator

4. Keep the day-grouped collapsible structure and infinite scroll unchanged

### Data Change

In `fetchMatches`, update the profiles query to include `avatar_url`:
```
.select("user_id, name, avatar_url")
```

Pass avatar data through `MatchRow` interface (add `userAvatar`, `partnerAvatar`, `opponentAvatars` fields) so the card can render `Avatar` components.

### Visual Result

Each match history card will show:
```text
┌─────────────────────────────────────┐
│                        Casual  [W]  │
│  You    (●)   6 – 4   (●)  Alex    │
│  John   (●)  GAMES    (●)  Sarah   │
└─────────────────────────────────────┘
```

Matching the exact same side-by-side style used when submitting scores in the game detail page.

