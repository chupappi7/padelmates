

# Request, Pay, and Confirm Flow

## Overview

When a host selects "Request & Pay" join mode, the player journey adds a payment step between acceptance and full confirmation. The flow uses the existing event group chat for payment coordination (QR codes, proof screenshots, etc.).

## Player Journey

```text
Player requests to join
       |
  [Status: Pending / Requested]
       |
  Host accepts (confirms space available)
       |
  [Status: Accepted, Payment: "awaiting_payment"]
  Player sees banner: "Pay to confirm your spot"
       |
  Player sends payment proof in event chat
  (host shares QR/bank details in chat too)
       |
  Host clicks "Confirm Payment" on player card
       |
  [Payment: "confirmed"]
  Player fully confirmed
```

## What Changes

### 1. Update accept logic for "request_and_pay" games
In `GameDetailPage.tsx`, when `join_mode === "request_and_pay"` and the host accepts a request:
- Set `payment_status` to `"awaiting_payment"` (instead of leaving it as `"not_required"`)
- Set `payment_due_at` to now + `payment_deadline_hours` (default 48h)
- Still add player to `game_players` so they get chat access
- Send notification: "You've been accepted! Please send payment to confirm your spot."

### 2. Add "Awaiting Payment" row in ParticipantsTab
Add a new section between "Confirmed Players" and "Join Requests" called "Awaiting Payment" that shows accepted players whose `payment_status === "awaiting_payment"`:
- Shows player card with a yellow "Awaiting Payment" badge
- Host sees a "Confirm Payment" button on each card
- When host clicks "Confirm Payment", update `payment_status` to `"confirmed"` and notify the player

### 3. Update status banners in GameDetailPage
Add new banner states for the joining player:
- "Accepted -- Send payment in the chat to confirm your spot" (with link to chat tab)
- "Payment confirmed -- You're in!" (green success banner)

### 4. Update JoinRequestModal for request_and_pay
When `join_mode === "request_and_pay"`, show the price info in the modal:
- Display price per player
- Brief explanation: "Request first, then pay after host accepts"

### 5. Update join mode label in Details tab
Show "Request & Pay" instead of just "Request" when `join_mode === "request_and_pay"`.

## Technical Details

### Files to modify:
- **`src/pages/Games/GameDetailPage.tsx`** -- Update `handleAcceptRequest` to set payment fields for request_and_pay games; add new status banners for awaiting_payment state
- **`src/components/games/ParticipantsTab.tsx`** -- Add "Awaiting Payment" section with player cards showing payment status badges; add "Confirm Payment" button for host; add new `onConfirmPayment` callback prop
- **`src/components/games/JoinRequestModal.tsx`** -- Accept new props (`joinMode`, `pricePerPlayer`) and show price info when applicable

### No database changes needed
All columns already exist: `payment_status`, `payment_due_at` on `join_requests`, and `payment_instructions`, `price_per_player`, `payment_deadline_hours`, `join_mode` on `games`. The RLS policies already allow hosts/admins and the user themselves to update join_requests.

### Chat-based payment coordination
No new upload flow needed -- players and hosts use the existing event group chat to share bank details, QR codes, and payment screenshots (image sharing is already supported).

