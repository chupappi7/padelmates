

# Add Personal Details to Profile Page

Display the user's email, region, sex, and age on the profile page below the hero card.

## Changes

### 1. Update ProfilePage to fetch and pass extra data

- Fetch `user.email` from the auth context (already available via `useAuth`)
- Fetch `region`, `sex`, and `birth_year` from the profile query (already fetched with `select("*")`)
- Compute age from `birth_year` using current year
- Pass these to a new info section component

### 2. Add a Personal Details section

Add a new card between the Hero Card and Performance Stats with a clean row layout:

```
PERSONAL DETAILS
Email        thinh@example.com
Region       Prague
Sex          Male
Age          28
```

- Uses the same card styling as Performance Stats (bg-card, border, rounded-xl)
- Each row is a label + value pair
- Only shows rows where data exists (skip nulls)
- Region maps from the stored value, sex is capitalized
- Age is calculated as `currentYear - birth_year`

### Technical Details

**Files to modify:**
- `src/pages/Profile/ProfilePage.tsx` -- add the personal details section between hero card and performance stats, using data already available from the `select("*")` query and `user.email`

**No new components needed** -- the section is simple enough to inline, keeping it consistent with how PerformanceStats is rendered.

**No database changes needed** -- all fields already exist in the profiles table and auth context.
