

## Plan: Style Friends Filter as Toggle Pill

The "Friends" button currently uses a standard `Button` with `variant="outline"` which looks visually disconnected from the dropdown filters. Make it a compact toggle pill that sits naturally in the filter row.

### Change in `src/pages/Games/GamesListPage.tsx` (lines 396-406)

Replace the current `Button` with a rounded pill-style toggle that matches the filter row aesthetic:

```tsx
<button
  onClick={() => setFriendsJoining(!friendsJoining)}
  className={cn(
    "h-9 px-3 rounded-full text-sm font-medium inline-flex items-center gap-1.5 border transition-colors shrink-0",
    friendsJoining
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-transparent text-muted-foreground border-border hover:bg-accent"
  )}
>
  <Users className="w-3.5 h-3.5" />
  Friends
</button>
```

Key differences from current:
- `rounded-full` pill shape instead of rectangular button
- `h-9` (smaller, matching pill proportions) instead of `h-11`
- Muted text when inactive, primary fill when active
- Feels like a filter chip rather than an action button

Single file edit, ~10 lines changed.

