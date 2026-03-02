

# Rebrand: PadelHub to PadelMates

Rename the app from "PadelHub" to "PadelMates" across the entire codebase.

## Changes

### 1. `index.html` -- Page title and meta tags
- Title: "Lovable App" -> "PadelMates"
- Description: "Lovable Generated Project" -> "Find your next padel game. Host matches, join local games, and connect with players."
- OG title/description updated to match
- Remove TODO comments

### 2. `src/components/layout/Navbar.tsx` -- Logo text
- `Padel<span>Hub</span>` -> `Padel<span>Mates</span>`

### 3. `src/pages/LandingPage.tsx` -- Landing page references (3 occurrences)
- CTA paragraph: "...using PadelHub..." -> "...using PadelMates..."
- Footer logo text: "PadelHub" -> "PadelMates"
- Footer copyright: "PadelHub" -> "PadelMates"

### Summary
- 3 files modified
- All user-visible "PadelHub" / "Lovable App" references replaced with "PadelMates"
