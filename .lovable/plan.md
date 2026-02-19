
## Game Card Redesign — Cleaner, Clearer Layout

### What's wrong with the current card

Looking at the screenshot and the current code, the issues are:

1. **Duration** shows as just "1.5h" with a colored dot — this is unclear, users don't know what it means without context (is it time left? duration?)
2. **Badges row** (Available/Hosting/Joined) sits next to the title making it cramped on mobile
3. **Row 3 is sometimes empty** (if no duration), creating inconsistent card heights
4. **Urgency signaling** only uses the left border — subtle and easy to miss

---

### Proposed Layout (fixed 3-zone structure)

```text
┌────────────────────────────────────────────────┐
│  Title                               [LVL 3]  │  ← Row 1: Title + skill chip top-right
│  📍 Location · 1.2km                           │  ← Row 2: Location + distance
├────────────────────────────────────────────────┤
│  ⏱ 1h 30m          [Available] [Hosting]       │  ← Row 3: Duration pill + status chips
├────────────────────────────────────────────────┤
│  [T] Host Name          👥 1/4 · 3 left  200Kč │  ← Row 4: Host + spots + price
└────────────────────────────────────────────────┘
```

---

### Key Changes

**Row 3 — Duration shown as a pill with clock icon**
- Replace bare "1.5h" + dot with a proper pill: `⏱ 1h 30m` or `⏱ 90 min`
- This makes it instantly clear it's a duration, not a countdown
- The pill itself gets urgency color (red/orange/teal) when close to start time
- Status badges (Available/Taken/Hosting/Joined) move here — they belong next to duration context, not crowding the title

**Row 1 — Title only (cleaner)**
- Title gets full width, no badge crowding
- Skill level chip stays top-right (as in the reference image — looks good)

**Urgency coloring**
- Keep the left border stripe for urgent games
- Additionally color the duration pill background (e.g. red pill for < 3h) — much more visible than a colored dot

**Duration format**
- `1h 30m` instead of `1.5h` — more natural to read
- `2h` if exact hour (no "2h 0m")
- Shown as a subtle chip: `[⏱ 1h 30m]` in muted color, turns red/orange when urgent

**Spot count**
- Keep the color-coded rounded bubble (green/orange/red) in bottom-right — this is working well per the reference image

---

### Technical Changes

**File: `src/components/games/GameCard.tsx`**

1. Remove badges from Row 1 (title row) — title gets full width
2. Add new Row 3 with:
   - Duration as `⏱ Xh Ym` pill (color = urgency)
   - Status badges (Available/Taken/Hosting/Joined) inline after duration
3. Duration formatting helper: convert decimal hours → `Xh Ym` or `Xh`
4. Urgency pill background styling for < 3h (red), < 12h (orange), < 24h (teal)
5. Keep Row 4 (host + spots + price) unchanged — it's clean as-is

```typescript
// Duration formatting helper
const formatDuration = (hrs: number) => {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

// Urgency pill classes
const getUrgencyPill = (hoursUntil: number) => {
  if (hoursUntil < 3) return "bg-destructive/15 text-destructive border-destructive/25";
  if (hoursUntil < 12) return "bg-warning/15 text-warning border-warning/25";
  if (hoursUntil < 24) return "bg-primary/10 text-primary border-primary/20";
  return "bg-muted text-muted-foreground border-border";
};
```

No database changes needed — this is purely a UI component change.
