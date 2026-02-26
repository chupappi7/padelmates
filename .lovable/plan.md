

## Remove Search Bar from Matches Page

The search input on the games list page will be removed since it's unnecessary for this use case.

### Changes

**`src/pages/Games/GamesListPage.tsx`**:
- Remove the `searchQuery` state variable
- Remove the `Search` icon import (if unused elsewhere)
- Remove the search `Input` element and its wrapper `div`
- Remove the `matchesSearch` filter condition from the `filteredGames` memo
- Adjust the filter row layout so the Type dropdown and skill filter fill the space naturally
- Remove `searchQuery` from the empty-state hint text condition

The Type dropdown and Skill filter will remain in a clean row below the Day Picker.

