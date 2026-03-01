
# Share Modal for Match Detail Page

## Overview
Replace the current "copy link" share button with a bottom sheet that offers two sharing options:
1. **Copy Link** - Same as current behavior
2. **Send to Friend** - Pick a friend from your list and send the event link as a DM message

## UI Design
- Tapping the Share icon opens a **bottom Sheet** (consistent with other sheets in the app like FriendPickerSheet)
- Two-step flow:
  - **Step 1**: Show share options (Copy Link, Send to Friend)
  - **Step 2**: If "Send to Friend" is selected, show a searchable friends list to pick a recipient

## Implementation

### New Component: `ShareGameSheet.tsx`
Located at `src/components/games/ShareGameSheet.tsx`

- Props: `open`, `onOpenChange`, `gameId`, `gameTitle`
- **Step 1 view**: Two option rows:
  - Copy Link row with Link icon - copies URL and shows toast
  - Send to Friend row with Send icon - transitions to step 2
- **Step 2 view**: Friends list (reusing `useFriends` hook)
  - Search input to filter friends
  - Tapping a friend sends the game link as a DM message (finds or creates a chat, then inserts a `chat_messages` row with the event URL and title)
  - Shows success toast: "Link sent to [name]!"
  - Auto-closes the sheet

### DM Send Logic
Reuses the existing pattern from `ProfileActionButtons.tsx`:
1. Check for existing DM chat between current user and selected friend
2. If none exists, create one via `chats` table insert
3. Insert a `chat_messages` row with a formatted message like: "Check out this match: [title] - [url]"

### Changes to `GameDetailPage.tsx`
- Import and render `ShareGameSheet`
- Replace the inline `onClick` copy logic on the Share2 button with opening the sheet

## Technical Details

| File | Change |
|------|--------|
| `src/components/games/ShareGameSheet.tsx` | New component |
| `src/pages/Games/GameDetailPage.tsx` | Wire up sheet to existing share button |

No database changes required - uses existing `chats` and `chat_messages` tables.
