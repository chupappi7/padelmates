
## Bank Details in Profile + Smart Chat Templates for Court Sharing

### What's being built

Three interconnected improvements:

1. **Bank details saved in profile** — users add their payment info once, reuse it everywhere
2. **User interest template** — when a user opens a court-sharing chat, the input is pre-filled with a ready-to-send message referencing the listing's location and date/time
3. **Host "Send Bank Details" quick button** — host taps one button to instantly send their saved bank details into the chat

---

### Part 1 — Database: Add `bank_details` column to `profiles`

A migration will add a single `bank_details` text column (nullable) to the `profiles` table. This stores a freeform string like:

```
Bank: BCA
Account: 1234567890
Name: Ahmad Reza
```

No new table needed — it lives on the user's existing profile, protected by the existing RLS (only the user can update their own profile).

---

### Part 2 — Profile Page changes (`src/pages/Profile/ProfilePage.tsx`)

A new **"Payment Info"** section card below the stats grid, always visible. It shows:

- **View mode**: Displays saved bank details in a styled box with a copy button, or a prompt to add details if empty
- **Edit mode**: Opens an inline form with a `Textarea` for bank details (account name, bank name, account number, etc.) with a save button

The edit flow integrates into the existing `editing` state — a second dedicated edit section for bank details only (separate from the profile name/skill edit) to keep UX clean.

---

### Part 3 — CourtDMChat changes (`src/components/games/CourtDMChat.tsx`)

**User side — pre-filled interest template:**

When a non-host user opens the chat for the first time (0 messages in the thread), the message input is pre-populated with:

```
Hi! I'm interested in your court at [Location] on [Day, Date · Time]. Is it still available?
```

- The user can edit it freely before sending
- Once sent, it clears like a normal message
- If messages already exist, the input starts empty (normal behavior)

**Host side — "Send Bank Details" quick action button:**

- A `💳 Send Bank Details` button appears in the chat input area (next to the send button)
- On tap, it instantly inserts a message with the host's saved bank details into the chat, formatted as:

```
💳 Payment Details:
[bank_details from profile]
```

- If the host hasn't saved bank details yet, the button shows a tooltip/toast: "Add your bank details in Profile → Payment Info first"
- The host's `bank_details` are fetched once when the chat component mounts (via a profile query on `hostId`)

---

### Technical Implementation Details

**Files to change:**

| File | Change |
|---|---|
| `supabase/migrations/...sql` | `ALTER TABLE profiles ADD COLUMN bank_details text` |
| `src/integrations/supabase/types.ts` | Auto-updated |
| `src/pages/Profile/ProfilePage.tsx` | Add Payment Info card + edit form for bank details |
| `src/components/games/CourtDMChat.tsx` | Pre-fill template for user; Send Bank Details button for host |

**CourtDMChat prop addition:**
The component already receives `hostId`. It will fetch the host's `bank_details` from `profiles` on mount — no new props needed.

**Template pre-fill logic:**
```typescript
useEffect(() => {
  // Only pre-fill if: not host, no messages yet, chat just opened
  if (!isHost && messages.length === 0 && activeChatId) {
    const template = `Hi! I'm interested in your court at ${gameLocation} on ${format(new Date(gameDateTime), "EEE, MMM d · h:mm a")}. Is it still available?`;
    setNewMessage(template);
  }
}, [activeChatId, messages.length]);
```

**Send Bank Details logic (host):**
```typescript
const handleSendBankDetails = async () => {
  if (!hostBankDetails) {
    toast.error("Add your bank details in Profile → Payment Info first");
    return;
  }
  await supabase.from("chat_messages").insert({
    chat_id: activeChatId,
    sender_id: currentUserId,
    message: `💳 Payment Details:\n${hostBankDetails}`,
  });
};
```
