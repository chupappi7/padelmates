
## Smart Quick-Reply UX for Court Sharing Chat

### The Problem with the Current Flow

Right now both sides have to type custom messages back and forth. The conversation has predictable, repetitive steps — availability check, price negotiation, payment confirmation — but the UI treats it like a generic chat. The result: friction for both parties, potential for missed steps, and no clear "done" state.

### The Solution: A Guided Transaction Flow

Replace the blank chat with a **stage-based conversation** where both sides get context-aware quick-reply chips at each step. Neither party needs to type if they don't want to. The flow progresses through clear stages:

```text
BUYER taps "I'm Interested"
  → Auto-opens chat with pre-filled availability question
  
HOST sees message → replies with quick-reply chips:
  [✅ Yes, still available!]  [❌ Sorry, it's taken]

BUYER sees "Yes" → quick replies appear:
  [Great! What's the price?]  [Is it negotiable?]  [I'll take it!]

HOST replies with price → quick-reply chip:
  [💳 Send Payment Details]  (one tap, done)

BUYER sees bank details → quick reply:
  [✅ Payment sent!]  [📸 Upload proof]

HOST confirms → Confirm Booking button
```

---

### Implementation: 5 Distinct Stages

The system tracks which conversational stage the thread is in. Each stage renders different quick-reply chips for the correct party.

**Stage 1 — Availability**
- Buyer's first message auto-filled (already done ✓)
- Host gets chips: `Yes, still available! ✅` / `Sorry, it's taken ❌`

**Stage 2 — Price / Terms** (only after host confirms availability)
- Buyer gets chips: `What's the price?` / `Is price negotiable?` / `I'll take it at the listed price!`

**Stage 3 — Payment Request** (after price discussed)
- Host gets chip: `💳 Send Payment Details` (single tap, sends their bank info)
- Host gets chip: `✅ Confirm Booking` if listing is free/giveaway

**Stage 4 — Payment Confirmation** (after bank details sent)
- Buyer gets chip: `Payment sent! ✅` / `Can I send a screenshot?`

**Stage 5 — Booking Confirmed**
- Host sees the "Confirm Booking" button become prominent
- Confirmed state locks further transaction chips, shows success banner

---

### How Stage Detection Works

Rather than a complex DB column, stage is inferred from the last few messages in the thread:
- Stage 1 (default): No messages yet or first message is from buyer
- Stage 2: Last host message contains "available" keyword
- Stage 3: Last buyer message contains "price" or "take it"
- Stage 4: Last host message contains "💳 Payment Details" (bank details sent)
- Stage 5: Interest status = confirmed

This is lightweight — no new DB columns. The stage is computed client-side from messages array on every render.

---

### Visual Design

**Quick-reply chips** appear as a horizontally-scrollable row of rounded pill buttons ABOVE the text input, styled differently from the send button to avoid confusion:

```
┌─────────────────────────────────────────────────┐
│ Messages area (scrollable)                       │
├─────────────────────────────────────────────────┤
│ Quick replies (your turn):                       │
│ [✅ Yes, available!] [❌ Sorry, taken]           │
├─────────────────────────────────────────────────┤
│ [💳 Send Bank Details btn]  (host only)          │
│ [______ Type a message... ________________] [→]  │
└─────────────────────────────────────────────────┘
```

Tapping a quick reply:
1. Instantly sends that message (no edit step, direct send)
2. Clears the chips (stage advances on next render)
3. The buyer/host sees the sent message appear in the chat bubble

**Special bubble styling** for key messages:
- Bank details message → amber/gold card-style bubble with copy icon
- "Payment sent" → green bubble with checkmark
- "Sorry, it's taken" → muted/destructive tint

---

### Buyer-Side Quick Replies Summary

| After | Buyer sees chips |
|---|---|
| Chat opens (no messages) | Pre-filled input (existing ✓) |
| Host says "Yes, available" | "What's the price?" · "I'll take it!" · "Is it negotiable?" |
| Host sends bank details | "Payment sent! ✅" · "I'll send a screenshot" |
| Host confirms booking | *(no chips, show confirmed banner)* |

### Host-Side Quick Replies Summary

| After | Host sees chips |
|---|---|
| Buyer sends interest message | "✅ Yes, still available!" · "❌ Sorry, it's taken" |
| Buyer asks about price/terms | *(free text + Send Bank Details button)* |
| Buyer says "Payment sent" | "✅ Confirm Booking" becomes primary CTA |

---

### Files to Change

| File | Change |
|---|---|
| `src/components/games/CourtDMChat.tsx` | Add stage detection, quick-reply chip row, special bubble styling for bank/payment messages |

No database changes needed — stages are derived from existing message content + interest status.

---

### Technical Details

**Stage detection function (pure, runs on every render):**
```typescript
type ChatStage = "availability" | "price" | "payment_request" | "payment_sent" | "confirmed";

function detectStage(messages: ChatMessage[], interestStatus: string): ChatStage {
  if (interestStatus === "confirmed") return "confirmed";
  if (messages.length === 0) return "availability";
  const lastMessages = messages.slice(-5); // only look at recent
  const hasPaymentDetails = lastMessages.some(m => m.message.includes("💳 Payment Details"));
  const hasPaymentSent = lastMessages.some(m => m.message.toLowerCase().includes("payment sent"));
  const hasAvailable = lastMessages.some(m => m.message.toLowerCase().includes("available"));
  const hasPriceQuery = lastMessages.some(m => m.message.toLowerCase().includes("price"));
  if (hasPaymentDetails) return "payment_sent";
  if (hasPriceQuery || hasAvailable) return "payment_request";
  if (messages.length > 0) return "price";
  return "availability";
}
```

**Quick reply chip component (inline):**
```typescript
const QuickReplies = ({ chips }: { chips: { label: string; message: string }[] }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
    {chips.map((chip) => (
      <button
        key={chip.label}
        onClick={() => sendQuickReply(chip.message)}
        className="shrink-0 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 
                   text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
      >
        {chip.label}
      </button>
    ))}
  </div>
);
```

**`sendQuickReply` function** — sends directly without going through the text input, then clears:
```typescript
const sendQuickReply = async (message: string) => {
  if (!activeChatId || sendLoading) return;
  setSendLoading(true);
  await supabase.from("chat_messages").insert({
    chat_id: activeChatId,
    sender_id: currentUserId,
    message,
  });
  fetchMessages(activeChatId);
  if (isHost) loadInterestedUsers();
  setSendLoading(false);
};
```

**Special message bubble detection:**
```typescript
const isBankDetailsMsg = msg.message.startsWith("💳 Payment Details");
const isPaymentSentMsg = msg.message.toLowerCase().includes("payment sent");
```
Bank details messages render as a distinct amber card bubble; payment-sent messages render in green.
