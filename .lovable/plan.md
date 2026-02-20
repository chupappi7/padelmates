
## Add Players Sheet — UX Redesign

### What the User is Looking At

The screenshot shows the current "Add Players" bottom sheet (`FriendPickerSheet.tsx`). It slides up from the bottom when the host taps "Add player" during game creation.

**Current problems:**
1. No slot awareness at the top — the user doesn't know how many spots are left before adding
2. Friend rows feel heavy (full bordered card for each item)
3. The `+` icon is a subtle grey — doesn't feel tappable or confirm anything
4. No visual feedback when a friend is added — the sheet stays open with no confirmation
5. Guest input is buried below the friends list — hard to discover without scrolling
6. "All slots filled" message appears only after the fact
7. Search field has no auto-focus — users have to tap it manually
8. No quick way to see currently added players while in the sheet

---

### Redesigned Architecture

The sheet is split into **two clear zones**:

```text
┌─────────────────────────────────────────────────────┐
│  Add Players                               ╳        │
│  ─────────────────────────────────────────────────  │
│  Slots: ●●○○  2 of 4 spots filled                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [ 🔍  Search friends...                  ]         │
│                                                     │
│  YOUR FRIENDS (3)                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ [T]  Thinh Tran      Level 3     [+ Add]    │   │
│  │ [M]  Maria Garcia    Level 4     [+ Add]    │   │
│  │ [J]  Jan Novak       Level 5     ✓ Added   │   │  ← already in list
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────── or add a guest ─────────────           │
│  [ Guest name...              ] [+ Add Guest]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Specific UX Changes

**1. Slot Indicator Header Row**

Below the title, show a compact slot bar:

```text
●●●○  3 of 4 spots used
```

- Dot pills: filled (primary colour) = taken, empty (muted) = open
- Count label: "X of Y spots used" — always visible
- When full: label turns amber/orange: "All spots filled"
- This sets the user's mental model before they even scroll

**2. Friend Rows — Simpler & More Tappable**

Replace the heavy bordered-card rows with a lighter list-item style:
- Avatar (32px) · Name + skill chip · `+ Add` pill button on the right
- No outer border on each row — use a subtle separator line between rows instead
- `+ Add` pill: primary-coloured, small, rounded-full — clearly tappable
- If already added: replace with a green `✓ Added` label (not tappable, just a state indicator)
- Disabled state (slots full): row dims, `+ Add` button greyed out

**3. Add with Instant Feedback**

When a friend is tapped:
- The `+ Add` button becomes `✓ Added` with a green colour
- Slot indicator updates immediately (dot fills)
- Sheet stays open so host can keep adding — but the change is visually confirmed

**4. Guest Input — Promoted Higher**

Currently the guest section is invisible unless you scroll. Fix:
- Make it a sticky element or place it immediately after the friends list (not pushed below a long scroll)
- On mobile with few/no friends: guest input appears first or in equal prominence

**5. Empty States**

- No friends at all: show a simple icon + "No friends added yet" + a short note "Add friends from the Friends tab"
- No search results: "No match for '{query}'" — simple, not distracting

**6. Slot-Full State**

When all slots are filled:
- Every friend row dims
- `+ Add` buttons become disabled and visually locked
- Amber banner at top: "All spots filled — remove a player to swap"
- Guest input also disables

---

### What Changes

**File: `src/components/friends/FriendPickerSheet.tsx`**

1. **Slot header row**: Derive dot-pill indicators from `selected.length` and `maxSlots`. Show `X of Y spots used` label. Change to amber/warning when full.

2. **Friend row redesign**:
   - Remove the outer `border border-border` wrapper per row
   - Add `border-b border-border/50 last:border-0` separator style instead
   - Change `<Plus className="w-4 h-4 text-muted-foreground" />` to a small `+ Add` pill button `(px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground)`
   - When friend is already in `selected`: show `✓ Added` in green instead of the button

3. **Guest section**: Move the "or add a guest" block up so it's always visible (sticky to bottom of scrollable area, or positioned before the friend list when friends = 0)

4. **Auto-focus**: Add `autoFocus` to the search input so keyboard opens immediately on mobile (optional — only add if it doesn't conflict with sheet animation)

5. **Container cleanup**: Tighten spacing from `space-y-4` to `space-y-3` and reduce visual noise between sections

---

### What Does NOT Change

- `FriendPickerSheet` props interface (`open`, `onOpenChange`, `selected`, `onSelect`, `maxSlots`) — no changes
- `addFriend` and `addGuest` logic — no changes
- `useFriends` hook integration — no changes
- `PrefilledPlayer` type — no changes
- Sheet slide-up animation and `max-h-[80vh]` — no changes
- `SkillBadge` component — no changes
- Any call sites in `CreateGamePage.tsx` — no changes

---

### Visual Summary

| Element | Before | After |
|---------|--------|-------|
| Slot awareness | None | Dot-pill bar with count label |
| Friend row style | Heavy bordered card | Light list item with separator |
| Add button | Grey `+` icon | Primary `+ Add` pill |
| Already-added state | Hidden (filtered out) | `✓ Added` green label |
| Slots full feedback | Text below list | Amber header + disabled rows |
| Guest section | Buried after scroll | Always visible, less buried |
