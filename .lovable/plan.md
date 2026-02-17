

# Friend System + Smart Player Picker for Game Creation

## Overview

Add a social network layer (friend requests) and upgrade the "Players already joining" picker so hosts can search and select from their friends list -- or still type a name manually for non-app users.

---

## What Changes for the User

### 1. Friends Tab (new section on Profile page)
- A "Friends" section on your profile showing your friend count and list
- Ability to search all app users by name and send them a friend request
- Incoming requests with Accept / Decline buttons
- Friends list with the ability to remove a friend

### 2. Upgraded Player Picker (Create/Edit Game)
The current plain text inputs for "Players already joining" become a smarter picker:
- A search input that queries your friends list in real-time
- Select friends from dropdown results (shows avatar, name, skill level)
- Selected friends appear as chips with a remove button
- A fallback "Or type a name" option for guests without an account
- Friends added this way are stored the same as before (in `prefilled_players`) but with an optional `user_id` for future "claim slot" functionality

### 3. Friends Page (new route `/friends`)
- Accessible from Profile page or bottom tab bar (replaces "Clubs" or adds as sub-nav)
- Three sections: My Friends, Incoming Requests, Search Users

---

## Technical Details

### Database Changes (2 new tables)

**Table: `friendships`**
```
id           uuid  PK  default gen_random_uuid()
requester_id uuid  NOT NULL  (references profiles.user_id)
addressee_id uuid  NOT NULL  (references profiles.user_id)
status       text  NOT NULL  default 'pending'  ('pending', 'accepted', 'rejected')
created_at   timestamptz  default now()
updated_at   timestamptz  default now()
UNIQUE(requester_id, addressee_id)
```

**RLS Policies for `friendships`:**
- SELECT: Users can see rows where they are requester or addressee
- INSERT: Authenticated users can create where `requester_id = auth.uid()`
- UPDATE: Addressee can update status (accept/reject); either party can update
- DELETE: Either party can delete (unfriend)

**Update `prefilled_players` format** (backward compatible):
Currently stores `["Martin", "Petr"]`. Evolve to support both formats:
```json
["Martin", {"name": "Petr", "user_id": "uuid-here"}]
```
String entries = guest names (no account). Object entries = linked friends. The UI handles both.

### New Files

1. **`src/pages/Friends/FriendsPage.tsx`** -- Main friends management page with tabs for My Friends, Requests, Search
2. **`src/components/friends/FriendCard.tsx`** -- Reusable card for displaying a friend (avatar, name, skill, action button)
3. **`src/components/friends/FriendSearch.tsx`** -- Search input that queries profiles table with debounce
4. **`src/components/friends/FriendPickerSheet.tsx`** -- Bottom sheet / modal used in Create/Edit Game to pick friends or type guest names
5. **`src/hooks/useFriends.ts`** -- Hook for fetching friends list, pending requests, sending/accepting/removing

### Modified Files

1. **`src/App.tsx`** -- Add `/friends` route
2. **`src/components/layout/BottomTabBar.tsx`** -- Add Friends tab or make it accessible from Profile
3. **`src/pages/Profile/ProfilePage.tsx`** -- Add friends count stat + "View Friends" link
4. **`src/pages/Games/CreateGamePage.tsx`** -- Replace plain text inputs with FriendPickerSheet trigger
5. **`src/pages/Games/EditGamePage.tsx`** -- Same picker upgrade
6. **`src/components/games/ParticipantsTab.tsx`** -- Handle mixed format (string vs object) for prefilled players, show avatar for linked friends

### User Flow: Adding Friends

```text
Profile Page
  -> "4 Friends" stat card (clickable)
  -> Friends Page
     -> [Search bar: "Search users..."]
     -> Results: [Avatar] Martin (Level 4)  [Add Friend]
     -> Pending tab: [Avatar] Petr wants to be friends  [Accept] [Decline]
     -> Friends tab: [Avatar] Jana (Level 3)  [Remove]
```

### User Flow: Picking Players for a Game

```text
Create Game -> "Players already joining"
  -> [+ Add player] button
  -> Opens FriendPickerSheet:
     +----------------------------------+
     |  Add Players                     |
     |  [Search friends...          ]   |
     |                                  |
     |  YOUR FRIENDS                    |
     |  [Avatar] Martin (Lvl 4) [+]    |
     |  [Avatar] Jana (Lvl 3)   [+]    |
     |                                  |
     |  --- or ---                      |
     |  [Type a guest name...     ] [+] |
     +----------------------------------+

  -> Selected players appear as chips:
     [Martin x] [Jana x] [Guest: Petr x]
```

### Data Flow

```text
Host picks Martin (friend, has user_id) and types "Petr" (guest):
  prefilled_players = [
    {"name": "Martin", "user_id": "abc-123"},
    "Petr"
  ]

ParticipantsTab renders:
  - Martin: fetches avatar from profiles, shows as linked player
  - Petr: shows generic avatar with "Guest" badge
```

### Files Summary

| File | Action |
|------|--------|
| Database migration (friendships table) | Create |
| `src/pages/Friends/FriendsPage.tsx` | Create |
| `src/components/friends/FriendCard.tsx` | Create |
| `src/components/friends/FriendSearch.tsx` | Create |
| `src/components/friends/FriendPickerSheet.tsx` | Create |
| `src/hooks/useFriends.ts` | Create |
| `src/App.tsx` | Modify (add route) |
| `src/components/layout/BottomTabBar.tsx` | Modify (add Friends nav) |
| `src/pages/Profile/ProfilePage.tsx` | Modify (friends count) |
| `src/pages/Games/CreateGamePage.tsx` | Modify (use picker) |
| `src/pages/Games/EditGamePage.tsx` | Modify (use picker) |
| `src/components/games/ParticipantsTab.tsx` | Modify (mixed format) |

