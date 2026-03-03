

## Plan: Add Chat Actions Menu

### Changes

**1. Three-dot menu in chat header bar (next to user name)**

Add a `DropdownMenu` with `MoreVertical` icon button to the right side of the chat header, pushed to the far right with `ml-auto`. Options:
- **Mute** -- toggles muted state via `conversation_preferences` table
- **Block** -- placeholder action with toast (blocking logic can be expanded later)
- **Delete Chat** -- sets `deleted: true` in `conversation_preferences` and navigates back to `/messages`

**2. Long-press / context menu on individual chat bubbles**

Wrap each message bubble in a `ContextMenu` (from existing `@radix-ui/react-context-menu`). On mobile this triggers on long-press. Options:
- **Copy** -- copies message text to clipboard
- **Delete** -- deletes the message from `chat_messages` table (only for own messages)

### Files to Change

- `src/pages/Messages/ChatPage.tsx`
  - Import `DropdownMenu` components, `MoreVertical`, `Copy`, `Trash2`, `BellOff` icons, `ContextMenu` components
  - Add state for `muted`
  - Add `DropdownMenu` button after the user name/avatar section in header (line ~209, before closing `</div>`)
  - Wrap each message bubble in `ContextMenu` with Copy + Delete (own messages only) options
  - Add handler functions: `handleDeleteChat`, `handleMuteChat`, `handleDeleteMessage`, `handleCopyMessage`

