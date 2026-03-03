

## Plan: Enhanced Profile Page with Performance Analytics

### Overview
Add a **Performance & Analytics** section to the profile page that fetches real match data and displays rich stats. Restructure the page layout for better information density while maintaining the existing dark-navy hero + white-card design system.

### Changes

**1. New component: `src/components/profile/ProfilePerformanceCard.tsx`**

A white card section titled "PERFORMANCE" that fetches data from `match_players`, `matches`, and `match_submissions` tables for the current user. Displays:

- **Top stats row** (4 items in a grid): Matches Played, Wins, Losses, Win Rate %
- **Secondary stats row**: Current Win Streak, Best Win Streak, Games Hosted (from `games` table where `host_id = user_id`), Games Joined (from `game_players`)
- **Form indicator**: Last 5 matches shown as a row of small W/L colored dots (green/red) — like a recent form strip
- **Monthly activity**: A simple text line like "12 matches this month" with a small bar chart using recharts (already installed) showing matches per month for the last 3 months

Data fetching:
- Query `match_players` joined with `matches` (status = completed) to get W/L counts
- Query `games` where `host_id = user_id` for hosted count
- Query `game_players` for joined count
- All in a single `useEffect`

Styling: White card with `rounded-2xl shadow-sm`, consistent with PersonalDetailsGrid. Stats use Space Grotesk font for numbers, `text-[11px] uppercase tracking` for labels.

**2. Update `src/pages/Profile/ProfilePage.tsx`**

- Import and render `ProfilePerformanceCard` between HeroCard and PersonalDetailsGrid
- Pass `userId` as prop
- Remove the standalone "Match History" button and integrate it as a link row at the bottom of the performance card ("View Full Match History →")

### Layout Order (top to bottom)
1. HeroCard (unchanged)
2. **ProfilePerformanceCard** (new)
3. PersonalDetailsGrid (unchanged)
4. ProfileClubs (unchanged)
5. Payment Info collapsible (unchanged)

### Files to Create
- `src/components/profile/ProfilePerformanceCard.tsx`

### Files to Modify
- `src/pages/Profile/ProfilePage.tsx` — add import, render new component, remove standalone Match History button

