

## Fix: Reposition Create Button

Move the Create button from the header row (where it crowds the title) to sit inline with the tabs row, pushed to the right. This gives the header breathing room and places the action next to the navigation context.

### Changes — `src/pages/Clubs/ClubsListPage.tsx`

1. Remove the Create button from the header `div` (lines 145-152)
2. Add it to the tabs row (line 156) — make the tabs container `flex justify-between items-center`, with tabs on the left and the Create button on the right
3. Make the Create button slightly smaller to match tab pill sizing

