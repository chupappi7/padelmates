

## Refactor: Dashboard, Matches Tab & Analysis Tab Overhaul

Three changes across three files.

---

### 1. Dashboard — Remove "View Full Match History" link

**`src/components/profile/tabs/ProfileDashboardTab.tsx`**

Remove the "View Full Match History" button at the bottom (lines 285-292). Dashboard keeps everything else (welcome card, PDR, stats, form strip, activity chart, top partner).

---

### 2. Matches Tab — Add "View Full Match History" link

**`src/components/profile/tabs/ProfileMatchesTab.tsx`**

- Accept new optional prop `isSelf?: boolean` (default `true`)
- After the match list, add a "View Full Match History" button that navigates to `/match-history` (self) or `/match-history/${userId}` (other)
- Same styling as the removed dashboard button

---

### 3. Analysis Tab — Complete Redesign

**`src/components/profile/tabs/ProfileAnalysisTab.tsx`**

Replace the current simple analysis with a period-filtered deep analytics view.

**Period selector**: Horizontal pill chips — `This Week`, `This Month`, `3 Months`, `All Time` (default: This Month)

**Data source**: Fetch all `match_players` rows for the user joined with `matches` (completed only), then filter client-side by selected period. Also fetch `game_players` + `games` for location data.

**Empty state rule**: If fewer than 3 matches in selected period, show: *"Not enough data for [period]. Play more matches to see your stats here."* — but still show the Streaks section below.

**Sections displayed (in order)**:

1. **Overview card** — Matches played, Wins, Losses, Win Rate % (4-col grid, same style as dashboard stats)

2. **Win Rate Trend** — Line chart (recharts `LineChart`) showing win rate over time buckets appropriate to the period (daily for week, weekly for month/3mo, monthly for all-time). X-axis = time labels, Y-axis = win %. Teal line.

3. **Streaks** — Current W streak, Best W streak, Current L streak (always shown even with <3 matches)

4. **Most Played Partner** — Avatar + name + match count (same query pattern as dashboard's Top Partner, but filtered to period)

5. **Toughest Opponent** — Player on the opposing team with highest win rate against this user (minimum 2 encounters). Show name + record (e.g. "1W–3L")

6. **Favourite Location** — Top location by match count in period

7. **W/L per location** — Small bar chart or list showing win rate per location (if multiple locations exist)

**Technical approach**:
- Single data fetch on mount: all match_players + matches for user, all match_players for those matches (to find partners/opponents), game data for locations
- Filter client-side when period changes (no re-fetch)
- Use `subDays`, `subMonths` from `date-fns` for period boundaries
- Reuse existing card styling (white, border-[#E2E8F0], rounded-2xl)

