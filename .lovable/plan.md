

## Fix: Remove Leave Button from Club Cards

The leave button on club list cards is awkward UX — users shouldn't accidentally leave a club from a list view. The leave action already exists in the club detail page's dropdown menu, which is the appropriate place for it.

### Changes

**`src/pages/Clubs/ClubsListPage.tsx`**

1. Remove the `LogOut` icon import and `leavingId` state
2. Remove the `handleLeave` function
3. In the "My Clubs" tab action area, remove the leave button for members — keep only the Settings icon for owners/admins and the "Joined" badge for all members
4. Clean up unused imports (`LogOut`)

The card will simply show:
- **Owner/Admin**: Settings gear icon + "Joined" badge
- **Member**: Just the "Joined" badge (tapping the card navigates to detail page where they can leave via the dropdown)

