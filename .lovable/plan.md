
## Enrich Game Notifications with Context

### Problem
Game notifications like "Player Joined", "Join Request", and "Confirmed to Play" only show the game title. When multiple games have similar titles (e.g., "Looking for 2 players"), notifications become indistinguishable.

### Solution
Add date, location, time, and player count to all game-related notification messages so each one is uniquely identifiable at a glance.

**Before:**
```
Player Joined
Ahmed joined "Looking for 2 players"
```

**After:**
```
Player Joined
Ahmed joined "Looking for 2 players" | Club XYZ · Feb 18, 6:00 PM · 3/4
```

### Changes

#### 1. GameDetailPage.tsx -- Enrich outgoing notifications (lines ~260-300)

Update `notifyHost` calls in `handleDirectJoin` and `handleLeaveGame` to include game location, date, and current player count in the message string. The `game` object already has `location`, `date_time`, and `max_players` available in scope, and `players.length` gives the current count.

- `handleDirectJoin` message becomes:
  `Ahmed joined "Looking for 2" | Club XYZ · Feb 18, 6:00 PM · 3/4`
- `handleLeaveGame` message becomes:
  `Ahmed left "Looking for 2" | Club XYZ · Feb 18, 6:00 PM · 2/4`

#### 2. JoinRequestModal.tsx -- Add location/date props

- Add `gameLocation` and `gameDateTime` props to `JoinRequestModalProps`
- Update the notification insert message to include context:
  `Ahmed wants to join "Looking for 2" | Club XYZ · Feb 18, 6:00 PM`
- Pass these new props from `GameDetailPage.tsx` where the modal is used

#### 3. useNotifications.ts -- Enrich "Confirmed to Play" notifications (lines ~79-108)

- When fetching accepted join requests, also select `location`, `date_time`, and `max_players` from the games table (alongside `title`)
- Also query `game_players` count for those game IDs
- Update the message to include context:
  `You're confirmed for "Looking for 2" | Club XYZ · Feb 18, 6:00 PM · 3/4`

#### 4. NotificationPanel.tsx and NotificationsPage.tsx -- Display improvements

- Use `formatDistanceToNow` from date-fns for relative timestamps (e.g., "2h ago" instead of just a date)
- The enriched message text will naturally display the extra context since it's embedded in the message string -- no UI layout changes needed

### Technical Details

A helper function `formatGameContext` will be created to consistently format the context suffix:

```typescript
// Shared helper (inline in each file or extracted)
const formatGameContext = (location: string, dateTime: string, current?: number, max?: number) => {
  const d = new Date(dateTime);
  const dateStr = format(d, "MMM d, h:mm a");
  const countStr = current !== undefined && max !== undefined ? ` · ${current}/${max}` : "";
  return `${location} · ${dateStr}${countStr}`;
};
```

Files to modify:
- `src/pages/Games/GameDetailPage.tsx` -- enrich notifyHost messages
- `src/components/games/JoinRequestModal.tsx` -- add props, enrich message
- `src/hooks/useNotifications.ts` -- enrich "Confirmed to Play" fetch
- `src/components/layout/NotificationPanel.tsx` -- relative time
- `src/pages/Notifications/NotificationsPage.tsx` -- relative time
