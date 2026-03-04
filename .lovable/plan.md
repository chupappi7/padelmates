## Plan: Show Game Score, Simplify Score Picker, Add End Session

### Problem

Currently each round displays "1 - 0 SETS" with set score pills below. Since each round is a single match, it should show the actual game score (e.g., "7 - 6 ") as the main number. Also need an "End Session" button and score submission restricted to host/admin.

### Changes

**1. Simplify `ScoreScrollPicker` — remove multi-set UI**

- Remove set tabs, add/remove set buttons — each round is one game score only
- Change dialog title from "Set Score" to "Score"
- Remove summary section showing sets won
- The picker becomes: two scroll columns for Team 1 and Team 2 game scores (0-7), confirm button
- `onConfirm` callback still passes the score but simplified (single game score, not array of sets)

**2. Update `MatchesTab` score display**

- Change big center score to show the game score directly (from `set_scores[0].t1` / `set_scores[0].t2`) instead of sets won
- Change label from "Sets" to "Games"
- Remove set score pills below (since there's only one game per round, the pills are redundant — the big score IS the game score)
- Update `handleSubmitScore` to store the single game score: `team1_score` and `team2_score` get the actual game points (e.g., 7 and 6), `set_scores` stores the single entry for compatibility

**3. Add "End Session" button**

- Below all match cards and the Randomize/Choose Teams buttons, add an "End Session" button (only visible to host/admin via `canManage`)
- Only enabled when all matches are completed
- On click: confirms all scores, could update game status or trigger stats calculation
- For now: marks the game as ended and shows a success toast

**4. Score submission already gated by `canManage**`

- The "Enter Score" / "Edit Score" buttons are already wrapped in `{canManage && ...}` — this is correct, only host and admin can submit scores. No change needed here.

5. games will update users stats in profile, matches to matches history, to stats winrate, matches played etc.

### Files to edit

- `src/components/games/ScoreScrollPicker.tsx` — simplify to single game score
- `src/components/games/MatchesTab.tsx` — update display, add End Session button