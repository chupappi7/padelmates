

# Signup Page Redesign — 3-Step Grouped Wizard

## Overview
Transform the signup from a basic form into a polished 3-step wizard with a progress indicator, smooth animations, and two new profile fields (sex, age).

## Database Migration
Add two new columns to the `profiles` table:
- `sex` (text, nullable) — values: `"male"`, `"female"`, `"other"`
- `birth_year` (integer, nullable) — storing birth year instead of age so it doesn't go stale over time

## Signup Steps

### Step 1: "Create your account"
- Full Name (required)
- Email (required)
- Password with show/hide toggle (required, min 6 chars)
- Button: "Continue"

### Step 2: "About you"
- Sex — 3 pill-style toggle buttons: Male / Female / Other (required)
- Age (optional) — number input, placeholder "e.g. 28"
- Region — dropdown with 14 Czech regions (required, no "skip")
- Button: "Continue"

### Step 3: "Your padel level"
- Self-rank — large tappable cards for A / B / C / D with brief descriptions (e.g. A: "Tournament / competitive", B: "Regular player", C: "Casual / learning", D: "Beginner")
- Button: "Create Account"

## UI Details
- **Progress bar** at top of card: 3 dots/segments showing current step, filled with primary color
- **Back arrow** on steps 2 and 3 to go to previous step
- **AnimatePresence** slide transitions between steps (same pattern as current)
- Account creation happens on Step 1 submit (email + password + name sent to auth)
- Steps 2 and 3 update the profile record after account is created
- "Already have an account? Sign in" link shown on Step 1 only

## Technical Details
- Rewrite `SignupPage.tsx` with 3 steps instead of 2
- Step type: `"account" | "about" | "skill"`
- After Step 1: call `signUp()`, then update `skill_level` in Step 3
- After Step 2: update `sex`, `birth_year`, `region` on profiles
- After Step 3: update `skill_level`, show success toast, navigate to `/games`
- Store birth year as `new Date().getFullYear() - age` when user enters age

## Files Changed
1. **New migration** — add `sex` and `birth_year` columns to profiles
2. **`src/pages/Auth/SignupPage.tsx`** — full rewrite with 3-step wizard

