
## Find Players — Player Count UX Redesign

### The Problem

The current UI asks the user to configure two separate numbers:
- "Looking for **X**" (derived, read-only)
- "out of **Y** total" (the only input, via a Select dropdown)

This is backwards and confusing because:
1. The user has to think in terms of **total capacity** (4 players) rather than what they actually care about — **how many more people they need**
2. The "Looking for X" number is just shown as a static badge — it looks clickable but isn't
3. When the user is NOT playing, it's even more confusing ("Looking for 4 out of 4 total?")
4. The math isn't obvious: total minus host minus prefilled = spots open. Users shouldn't need to compute this.

### The Fix: Lead with "Spots Needed"

Flip the mental model. The primary control is **how many more players do you need?** Everything else is derived and shown as supporting info.

**New layout:**

```text
┌─────────────────────────────────────────────────────┐
│  How many players do you need?                      │
│                                                     │
│   [ – ]      3      [ + ]                           │
│                                                     │
│   🟢 You · 2 confirmed · 3 spots open               │
│   Court total: 6 players                            │
└─────────────────────────────────────────────────────┘
```

- **Primary control**: `–` / `+` stepper directly setting `spotsNeeded` (1–7)
- **Supporting line**: "You · X confirmed · Y spots open" in muted text — makes the composition immediately readable
- **Court total**: shown as a derived output, not an input
- The "Are you playing?" toggle stays below as a secondary setting

### Detailed Behaviour

| Scenario | Stepper range | Derived total |
|----------|--------------|---------------|
| Host playing, 0 prefilled | 1–7 | spotsNeeded + 1 |
| Host playing, 2 prefilled | 1–5 | spotsNeeded + 1 + 2 |
| Host NOT playing, 0 prefilled | 2–8 | spotsNeeded |
| Host NOT playing, 2 prefilled | 1–6 | spotsNeeded + 2 |

Min spots needed is always 1. Max is capped so total court size doesn't exceed 8.

### "Are you playing?" Toggle

Currently this is buried. Move it **above** the player stepper so the answer to "am I in?" determines the stepper range before the user touches it.

**New section layout:**
1. "Are you playing?" — YES / NO pill toggle (or a checkbox-style row)
2. "How many players do you need?" — stepper
3. "Players already joining" — prefilled player list (unchanged)
4. Helper text with composition summary

### What Changes

**File: `src/pages/Games/CreateGamePage.tsx`**

1. Replace the `lookingFor` / `maxPlayers` state approach:
   - Introduce `spotsNeeded` state (default: 2), initialized from `effectiveLookingFor`
   - Derive `maxPlayers` = `spotsNeeded + prefilledCount + (hostIsPlaying ? 1 : 0)` — computed, never directly stored
   - Remove the `Select` dropdown for `maxPlayers` in find_players mode

2. Replace the current "Looking for X out of Y total" row with:
   - A clear label: **"How many more players do you need?"**
   - A `–` / `+` stepper button pair with the current count displayed prominently in the center
   - Min: 1, Max: `8 - prefilledCount - (hostIsPlaying ? 1 : 0)`
   - On stepper change, also trim prefilled players if they now exceed available slots

3. Move "Are you playing?" toggle **above** the stepper, styled as a labelled row with two pill buttons (Yes / No) for clarity

4. Add a compact summary line below the stepper:
   - `"You · 2 confirmed · 3 spots open · 6 total on court"` (only show segments that apply)

5. Keep `prefilled players` section unchanged below the stepper

6. On submit, `maxPlayers` is computed from the derived formula above

### What Does NOT Change
- The prefilled players section (Add player / FriendPickerSheet)
- All other sections (location, date, time, skill, price, join mode)
- The `effectiveLookingFor` value passed to game title on submit
- Any other host types (Americano, Find Backup, Sell Court)
