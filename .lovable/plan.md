

## Replace Post-Creation Invite Sheet with Share Template Sheet

After a game is created, instead of showing the "Invite Friends" sheet, show a **Share Template** sheet that displays the fully generated invite message with action buttons.

### What changes

**1. Create `ShareTemplateSheet` component** (`src/components/games/ShareTemplateSheet.tsx`)
- Bottom sheet with the pre-generated share message displayed in a styled read-only text area
- Two CTAs at the bottom:
  - **Mobile**: "Copy Link" button + "Send to WhatsApp" button (green)
  - **Desktop**: "Copy Link" button only
- Reuse the `buildMessage()` logic from `ShareGameSheet` (extracted or duplicated)
- Props: game details (location, dateTime, endDateTime, format, maxPlayers, hostName, skillLevel, minLevel, maxLevel, price, paymentMode, gameSlug/gameId), open/onOpenChange, onDone
- "Copy Link" copies the full template text to clipboard with a toast
- "WhatsApp" opens `https://api.whatsapp.com/send?text=...` with encoded message
- Skip/Done button below to dismiss and navigate to game detail

**2. Update `CreateGamePage.tsx`**
- Replace `<InviteFriendsSheet>` with `<ShareTemplateSheet>`
- Pass the form data (location, date/time, format, max players, price, etc.) and the user's profile name as host
- Keep the same open/close/navigate logic

**3. No changes to `ShareGameSheet`** — it remains for sharing from the game detail page

### UI layout of the sheet
- Header: "Share your game"
- Scrollable area showing the generated message in a styled container (monospace-ish, bg-muted rounded box)
- Sticky bottom with buttons: Copy Link (full width on desktop) | Copy Link + WhatsApp (50/50 on mobile)
- Skip/Done text button below

