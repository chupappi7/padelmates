

## Default "All Events" View with Optional Date Filtering

### Problem
Right now the games list defaults to showing only today's matches. Since the app is new with few users, this often results in an empty screen -- not a great first impression.

### Solution
Change the default to show **all upcoming events** across all dates, with the day picker acting as an optional filter users can tap into.

### How it works

1. **DayPicker gets an "All" button** -- a new first item in the horizontal scroll labeled "All" that, when selected, shows every upcoming game regardless of date.

2. **Default state is "All"** -- `selectedDate` starts as `null` instead of today's date. When null, no date filtering is applied and all upcoming games are listed.

3. **Date grouping in "All" mode** -- when showing all events, games are grouped by date with section headers (e.g., "Today", "Tomorrow", "Wednesday, Feb 18") so users can still scan by day.

4. **Subtitle updates dynamically** -- the subtitle under "Matches" shows "All upcoming" when no date is selected, or the specific date when one is chosen.

5. **Empty state text adjusts** -- says "No upcoming matches" in All mode vs. "No matches on this day" when a specific date is selected.

---

### Technical Details

**`src/components/games/DayPicker.tsx`**
- Change prop type: `selectedDate: Date | null`
- Add an "All" button as the first item in the scroll list
- When "All" is selected (`null`), highlight it with primary styling
- Clicking a specific day sets that date; clicking the already-selected day or "All" resets to `null`

**`src/pages/Games/GamesListPage.tsx`**
- Change `selectedDate` state from `useState<Date>(new Date())` to `useState<Date | null>(null)`
- Update `filteredGames` filter: skip `isSameDay` check when `selectedDate` is `null`
- In "All" mode, group games by date with date headers (e.g., "Today -- Feb 16", "Tomorrow -- Feb 17", "Wed, Feb 18")
- Update subtitle: show "All upcoming" when `selectedDate` is null
- Update empty state messaging accordingly

