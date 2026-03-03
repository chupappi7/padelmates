

## Plan: Improve In-App Game Sharing

### Problem
When sharing a game to a friend via the share sheet, the message sent is just `"Check out this match! {url}"` which renders as plain text (visible in screenshot). The `SharedGameCard` never triggers because:
1. The regex expects `"Check out this match: "` (colon) but the code sends `"Check out this match! "` (exclamation)
2. The regex expects `/games/{uuid}` but the URL uses `/join/{slug}`

### Solution

**1. Change message format to a simple structured tag**

In `ShareGameSheet.tsx`, update `handleSendToFriend` to send a structured message:
```
[game:${gameId}]
```
This is clean, parseable, and lets the `SharedGameCard` component handle all the rich rendering (it already fetches game data and shows location, date, time, players, skill level).

**2. Update `ChatMessageContent.tsx` to detect `[game:uuid]` format**

Replace the complex regex with a simple pattern match for `[game:{id}]`. When detected, render the existing `SharedGameCard` component which already has a polished UI with all game details.

**3. Remove the old unused regex pattern**

The `GAME_SHARE_REGEX` pattern is no longer needed.

### Files to Change

- `src/components/games/ShareGameSheet.tsx` -- line 138: change message from `Check out this match! ${shareUrl}` to `[game:${gameId}]`
- `src/components/chat/ChatMessageContent.tsx` -- replace `GAME_SHARE_REGEX` with `[game:uuid]` detection pattern

### Result
The shared game will render as the existing rich `SharedGameCard` (showing title, location, date/time, players, skill badge, "View Match" CTA) instead of plain text. Tapping navigates to the game detail page.

