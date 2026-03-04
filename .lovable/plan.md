

## Plan: Post-Creation "Invite Friends" Modal

After a game is created successfully, show a bottom sheet where the host can invite friends. Each invite sends a `[game:gameId]` message to their DM, identical to ShareGameSheet's "Send to Friends" logic.

### Changes

**1. New component: `src/components/games/InviteFriendsSheet.tsx`**
- Bottom sheet with friend list, search, avatars, and Send/Sent buttons per row
- Reuses `useFriends` hook and the same DM logic from `ShareGameSheet` (find-or-create chat, insert `[game:gameId]` message)
- "Skip" link at bottom to dismiss without inviting
- On close/skip: calls `onDone()` callback
- Props: `open`, `onOpenChange`, `gameId`, `onDone`

**2. Edit `src/pages/Games/CreateGamePage.tsx` (lines 270-279)**
- Add state: `createdGameId: string | null`
- After successful insert, instead of `navigate(...)`, set `createdGameId = data.id` to open the invite sheet
- Render `<InviteFriendsSheet>` at bottom of component
- On sheet done/skip: `navigate(/games/${createdGameId})`

### Flow
1. User creates game → toast "Game created!"
2. InviteFriendsSheet opens with friend list + search
3. User taps "Send" on any friends → sends `[game:id]` to their DMs
4. User taps "Done" or "Skip" → navigates to game detail

