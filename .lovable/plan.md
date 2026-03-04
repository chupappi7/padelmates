

## Plan: Improve Choose Teams Modal UX

The current modal already has a single player pool, but needs polish. The key insight: once 2 players are picked, the other 2 are obviously Team 2 -- make this feel instant and clear.

### Changes (single file: `MatchesTab.tsx`, lines 540-634)

**1. Player pool grid (lines 550-574)**
- Keep the 2-column grid of player buttons
- Selected players get teal fill (already done)
- Unselected players: when 2 are already picked, style the remaining as "Team 2" with a subtle secondary highlight (e.g. `bg-muted border-muted-foreground/20`) instead of looking like they can still be tapped
- Add a small "Team 1" / "Team 2" badge overlay on each player chip once teams are locked (2 selected)

**2. Replace the separate preview section (lines 576-623)**
- Remove the separate Team 1 / Team 2 preview block below the divider entirely
- Instead, once 2 players are selected, show a compact one-line summary: `"Team 1: Thinh, Alejandro  vs  Team 2: Fede, kiki"` — just text, no avatars, below the grid
- This eliminates redundancy since the grid itself already shows who is on which team via color coding

**3. Visual states in the grid**
- 0 selected: all players show neutral style, subtitle says "Tap 2 players for Team 1"
- 1 selected: picked player is teal, others neutral, subtitle says "Tap 1 more for Team 1"
- 2 selected: picked players are teal with "T1" indicator, other 2 get a softer secondary color with "T2" indicator, subtitle says "Teams set — ready to go"

**4. Create Match button (lines 625-632)**
- Keep disabled until exactly 2 picked — no changes needed

### Result
- No redundant preview section
- Color-coded grid makes teams instantly obvious
- Cleaner, shorter modal

