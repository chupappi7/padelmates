

## Refine ELO Page to a More Mature, Professional Style

The current design has playful elements (large bubbly badges, bright gradients, rounded pill shapes) that feel a bit "gamified." This plan tones it down to a cleaner, more premium sports-app aesthetic while keeping the same layout structure.

### Changes Overview

**1. Hero Section (`EloPage.tsx`)**
- Reduce ELO number size from 72px to 56px; use tighter letter-spacing and lighter font weight (extrabold instead of black)
- Remove decorative background circles for a cleaner look
- Replace the loud gradient tier badge with a subtler, smaller pill -- muted background with a thin border instead of full gradient fill
- Make the progress bar thinner and more understated (1px height, muted colors)
- Stat pills: remove icons, use a cleaner layout with just numbers and labels in a more minimal style -- thin dividers between stats instead of separate rounded boxes
- Tone down the hero gradient slightly -- less saturated, more sophisticated dark tones
- Player name: slightly larger, normal weight instead of medium

**2. Tab Switcher**
- Use an underline-style active indicator instead of a filled pill background
- Lighter font weight on inactive tabs, medium on active
- Remove the white card wrapper around the tabs -- let them sit more naturally

**3. StatsTab (`StatsTab.tsx`)**
- Remove the "Rating Trend" header bold styling, use lighter weight
- Empty state: simplify the ghost chart, remove the large trophy icon, use smaller text
- Match history items: tighter spacing, more muted color contrast

**4. SubmitScoreTab & ForecastTab**
- No structural changes, just inherit the refined card styling (thinner borders, less shadow)

### Files to Modify

- `src/pages/Elo/EloPage.tsx` -- Hero section refinements, tab switcher style
- `src/components/elo/StatsTab.tsx` -- Lighter card styling, refined empty states

### Design Direction
- Less rounded corners on stat elements (rounded-lg instead of rounded-xl)
- Reduce shadow intensity throughout
- More whitespace, less visual clutter
- Typography: thinner weights, more restrained sizing
- Color: same palette but lower saturation/opacity on decorative elements
- Overall feel: think Strava or Apple Fitness rather than a mobile game

