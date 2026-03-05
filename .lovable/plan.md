

## Interactive Onboarding Tutorial

### Overview
A 6-step guided tutorial overlay shown to first-time users after onboarding. Uses dark backdrop with element highlighting, teal glow borders, and Framer Motion transitions.

### Database Change
- Add `tutorial_completed boolean default false` to `profiles` table via migration.

### New Files

**`src/components/tutorial/TutorialOverlay.tsx`**
- Self-contained component with 6 steps, each targeting a CSS selector/data attribute
- Uses `document.querySelector` + `getBoundingClientRect()` to position a "punch-out" highlight around the target element
- Dark semi-transparent backdrop with a CSS clip-path or box-shadow cutout
- Teal glow border around target (step 6 uses grey border + "Coming Soon" pill)
- Tooltip card (dark bg matching app style) with:
  - Step indicator "1 of 6" at top
  - Title + description
  - "Continue" button (final step says "Let's play")
  - "Skip tour" small grey text below
- Framer Motion `AnimatePresence` for step transitions
- On finish/skip: updates `profiles.tutorial_completed = true` via Supabase
- Handles window resize/scroll to reposition highlights
- Steps config:
  1. Target: games list container. "Find a match"
  2. Target: first game card. "See who is playing"  
  3. Target: Host FAB button in bottom nav. "Host a match"
  4. Target: share button (navigates to a game detail first or shows on detail page). "Share to WhatsApp" — larger tooltip
  5. Target: credits section. "Give credits"
  6. Target: PDR section (greyed out). "PDR Rating — Coming Soon" — grey border, Coming Soon pill

- Steps 4-6 require being on a game detail page. The tutorial will only show steps 1-3 on the games list, then for steps 4-6 we can either: navigate the user to a game detail page, or split the tutorial across pages. Simpler approach: **show all 6 steps on the games list page** using mock/placeholder positions for steps 4-6, OR show steps 1-3 on list, then guide user. 

**Revised approach**: Steps 1-3 highlight elements on GamesListPage. Steps 4-6 will use illustrative tooltip-only cards (no real element highlight) centered on screen, since those features are on other pages. This keeps the tutorial self-contained on one page.

### Modified Files

**`src/pages/Games/GamesListPage.tsx`**
- Add `data-tutorial="matches-list"` to the games container
- Add `data-tutorial="game-card"` to the first GameCard wrapper
- Import and render `<TutorialOverlay />` when user exists and `tutorial_completed === false`
- Fetch `tutorial_completed` from profiles

**`src/components/layout/BottomTabBar.tsx`**
- Add `data-tutorial="host-button"` to the Host FAB button

**`src/contexts/UserProfileContext.tsx`**
- Add `tutorial_completed` to the profile query and interface

**`src/pages/Profile/SettingsPage.tsx`**
- Add "Show tutorial again" button that sets `tutorial_completed = false` and navigates to `/`

### Technical Details
- Overlay uses `position: fixed` with `z-index: 9999`
- Cutout achieved via CSS `box-shadow: 0 0 0 9999px rgba(0,0,0,0.75)` on a positioned element matching target bounds
- Teal glow: `box-shadow` with `theme(colors.primary)` + spread
- Step 6 grey glow: `border-color: #64748B` instead of teal
- Tooltip positioned dynamically (above/below target based on viewport space)
- `useEffect` with `ResizeObserver` to track target element position changes
- Steps 4-6 use centered floating cards without element targeting since those UI elements are on different pages

