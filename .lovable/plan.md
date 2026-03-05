

## Plan: Fix Image Display in All Chat Views

### Problem
Image messages (`[image]...`) are rendered inside text message bubbles (with padding, background color) across all three chat views: ChatPage, GroupChatPage, and GameDetailPage. This makes images display incorrectly — they appear inside colored bubbles with text padding instead of rendering as standalone images like in the user DM chat.

### Solution
Add an `isImage` check alongside the existing `isGameCard` check in all three chat pages, so image messages render without the bubble wrapper — just like game card messages already do.

### Files to Change

**1. `src/pages/Messages/ChatPage.tsx`**
- Add `const isImage = msg.message.startsWith("[image]");` next to the existing `isGameCard` check
- Extend the conditional: `isGameCard || isImage` to use the bubble-free rendering path

**2. `src/pages/Messages/GroupChatPage.tsx`**
- Add `isImage` check before rendering each message
- Conditionally skip the bubble wrapper (`px-3.5 py-2 bg-primary/bg-muted`) for image messages, rendering `ChatMessageContent` directly with only the timestamp

**3. `src/pages/Games/GameDetailPage.tsx`**
- Same pattern: add `isImage` check and render image messages without the bubble wrapper

### Result
Images will display as standalone thumbnails (with the save button and lightbox on tap) without being wrapped in colored text bubbles — consistent across all chat interfaces.

