

## Simplify to "Free to Join" Version

Strip out all payment-related UI and logic, keeping a simple flow: host creates a match, users request to join, host accepts/rejects.

### Changes Overview

**1. CreateGamePage.tsx** -- Remove payment fields
- Remove the "Price (EUR)" input field
- Remove the "Payment Mode" selection (pay_to_join / confirm_first)
- Remove the "Payment Deadline" selector
- Remove the "Payment Instructions" textarea
- Keep: title, description, location, date/time, format, skill level, max players, host role, visibility
- Set `price_per_player: 0`, `payment_mode: "pay_to_join"` as defaults in the insert (no user input needed)

**2. GameDetailPage.tsx** -- Remove payment UI
- Remove the price/Euro info grid item (or show "Free")
- Remove the payment mode badge (Pay to Join / Pay Later)
- Remove the `PaymentUploadCard` component and its ref
- Remove `JoinStatusBadge` payment-related states (simplify to just "pending" / "accepted" / "rejected")
- Remove `showPaymentUpload` logic
- Remove `handleVerifyPayment` handler
- Simplify `handleAcceptRequest` to just accept + add to game_players (no payment_status, no payment_due_at)
- Simplify the `JoinRequestModal` -- just a simple confirmation dialog ("Request to Join?") with no payment info
- Update sticky CTA to just say "Request to Join" (remove price display)

**3. ParticipantsTab.tsx** -- Simplify to two sections
- Remove "Awaiting Payment" section entirely
- Remove payment-related filter buttons (Awaiting Payment)
- Remove payment proof viewing dialog
- Remove "Confirm" (verify payment) button
- Keep two sections only:
  - **Confirmed Players**: Host (if playing) + all accepted players in a grid
  - **Join Requests** (host only): Pending requests with Accept/Reject buttons
- Remove the "user awaiting payment" banner
- Simplify PlayerCard to not show payment status badges

**4. JoinRequestModal.tsx** -- Simplify
- Remove payment mode info card
- Remove payment instructions display
- Remove screenshot upload functionality
- Just show a simple "Request to Join this game?" confirmation with Cancel/Send Request buttons

**5. Components to leave unused (no deletion needed, just not imported)**
- `PaymentUploadCard.tsx` -- not used
- `JoinStatusBadge.tsx` -- simplify or remove usage
- `HostRequestCard.tsx` -- not used (ParticipantsTab handles it inline)

### Technical Details

**ParticipantsTab simplified sections:**
- "Confirmed Players" grid: host card + accepted requests + empty slot placeholders
- "Join Requests" list (host only): pending requests with Accept/Reject
- Filter buttons: just "All" and "Requests (N)" for host

**Accept flow simplified:**
- Host clicks Accept on a pending request
- Update `join_requests.status` to `"accepted"` (no payment_status changes)
- Insert into `game_players`
- Player immediately appears in "Confirmed Players" grid

**Join request flow simplified:**
- User taps "Request to Join"
- Simple modal: "Send a join request?" with Cancel/Send Request
- Insert into `join_requests` with `payment_status: "not_required"`
- User sees a simple pending status badge

