
## Booking Proof Page for Court Sharing

### What We're Building

A new **"Booking Proof"** tab (suggested name: **"Proof"** or **"Verification"**) on the court sharing listing page. When a host creates a "Sell / Give Away Court" listing, they can upload a screenshot of their booking confirmation (e.g. from the club's app or a booking email). This screenshot is then visible to buyers directly on the listing, building trust that the booking is real.

The final structure for court-sharing listings becomes: **Details · Proof · Messages**

---

### The Full Flow

```text
HOST (Create Listing)                    BUYER (View Listing)
──────────────────────                   ──────────────────────
1. Fills out court listing form
2. NEW: Uploads booking screenshot       1. Opens court listing
3. Screenshot saved to storage           2. Sees "Details" tab
4. Listing created                       3. Clicks "Proof" tab → sees host's
                                            booking screenshot + verified badge
                                         4. Clicks "Messages" to DM the host
```

---

### Changes Required

#### 1. Database: Add `booking_screenshot_url` column to `games` table

A new nullable `text` column to store the file path of the uploaded booking screenshot.

```sql
ALTER TABLE public.games 
ADD COLUMN booking_screenshot_url TEXT DEFAULT NULL;
```

A storage policy needs to be added so hosts can upload to a `booking-proofs/` subfolder in the existing `payment-screenshots` bucket (or a new dedicated bucket):

```sql
-- New bucket for booking proofs (public for easier viewing)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('booking-proofs', 'booking-proofs', false);

-- Upload policy
CREATE POLICY "Hosts can upload booking proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL
);

-- View policy (authenticated users can view)
CREATE POLICY "Users can view booking proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL);
```

#### 2. Create Court: Add Screenshot Upload to `CreateGamePage.tsx`

Inside the `sell_court` section of the form, add an optional image upload field:

- A dashed upload box labeled **"Upload Booking Confirmation (optional)"** with a sub-label "Email, app screenshot, etc."
- On file select: upload to `booking-proofs/{userId}/{timestamp}-{filename}` storage bucket
- Store the returned file path in local state `bookingScreenshotPath`
- Pass the path into the `games` INSERT as `booking_screenshot_url`

#### 3. New Tab: `BookingProofTab.tsx` component

A new component at `src/components/games/BookingProofTab.tsx` that:

- Fetches a signed URL for the `booking_screenshot_url` path stored in the game
- Displays a verification badge ("Verified Booking" with shield icon)
- Shows the screenshot image in a card with a "View Full Size" link
- If no screenshot uploaded: shows a friendly empty state ("No booking proof uploaded by host yet")
- If user is the host and no screenshot: shows an edit prompt to add one

#### 4. Add "Proof" Tab to `GameDetailPage.tsx`

For court-sharing listings, the tab bar changes from `Details | Messages` to `Details | Proof | Messages`:

- New tab key `"proof"` added to the court-sharing tab list
- Conditionally rendered `<BookingProofTab />` component when `activeTab === "proof"`
- Tab only appears when `isCourtSharing === true`

#### 5. Allow Hosts to Update Screenshot from Game Detail Page

On the Proof tab, when the host is viewing with no or existing screenshot:
- Show an "Upload / Replace Screenshot" button
- On upload, update the `games` table `booking_screenshot_url` with the new path via `supabase.from("games").update()`

---

### Technical Summary

| Area | File | Change |
|---|---|---|
| Database | migration SQL | Add `booking_screenshot_url` column to `games`, create `booking-proofs` bucket + policies |
| Create flow | `CreateGamePage.tsx` | Add optional screenshot uploader for `sell_court` host type |
| New component | `BookingProofTab.tsx` | Displays signed-URL screenshot with verified badge |
| Detail page tabs | `GameDetailPage.tsx` | Add "Proof" tab for court-sharing mode; render `BookingProofTab` |

---

### Tab Naming

The new tab will be called **"Proof"** (short, clear, fits mobile). The page section heading will read **"Booking Verification"**.
