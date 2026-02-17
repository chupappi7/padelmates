

# Search Friends by Name or User ID

## Overview
Instead of generating a separate friend code, use the existing user ID as the shareable identifier. The search on the Friends page will accept both a name (partial match) and a user ID (exact match) in a single input field.

## What Changes for the User

1. **Profile page** -- display your User ID with a copy-to-clipboard button
2. **Friends page (Search tab)** -- the existing search input accepts both names and user IDs; it auto-detects which one you typed
3. No new database columns or migrations needed

## User Flow

```text
Profile Page:
  Your ID
  a1b2c3d4-...  [Copy]

Friends Page -> Search tab:
  [Search by name or paste user ID...]  [Search]
  -> Paste full UUID -> instant exact match
  -> Type a name -> partial name search (existing behavior)
```

## Technical Details

### No Database Changes
The `profiles` table already has `user_id` (unique, not null). No migration needed.

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Profile/ProfilePage.tsx` | Add User ID display with copy-to-clipboard button below the avatar/name area |
| `src/pages/Friends/FriendsPage.tsx` | Update search logic: if input looks like a UUID, query by `user_id`; otherwise query by `name` (existing behavior). Update placeholder text. |

### Search Logic (in FriendsPage)

```text
if input matches UUID pattern (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
  -> query profiles WHERE user_id = input
else:
  -> query profiles WHERE name ILIKE '%input%' (existing behavior)
```

### Implementation Steps

1. Update `FriendsPage.tsx` search handler to detect UUID input and branch query accordingly
2. Update search input placeholder to "Search by name or paste user ID..."
3. Add User ID display + copy button to `ProfilePage.tsx` below the profile card

