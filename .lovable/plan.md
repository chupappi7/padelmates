

## Fix: Simplify filter row to three dropdowns + friends button

Remove the grid layout and use a simpler approach: three equal dropdowns (Type, Level, Club) plus the friends icon button.

### Changes

**`src/pages/Games/GamesListPage.tsx`** (~line 327)

Replace the current `grid grid-cols-[1fr_1fr_auto]` with:

```
<div className="flex gap-2 mt-4">
  <!-- Type select: flex-1 -->
  <!-- Level select: flex-1 -->
  <!-- Club select: flex-1 (or disabled button if no clubs) -->
  <!-- Friends icon button: w-11 shrink-0 -->
</div>
```

All three `SelectTrigger` elements get `className="h-11 w-full"` and their parent gets `flex-1 min-w-0`. This gives each dropdown equal space (~30% each) with the friends button taking minimal fixed width. Three short labels ("All Types", "All Levels", "All Clubs") will fit comfortably.

