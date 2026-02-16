

# Replace End Time Picker with Duration Chips

## Summary
Replace the separate End Time scroll picker with a row of duration chips (60 / 90 / 120 min). The end time will be auto-calculated from Start Time + Duration and shown as a read-only label. This applies to both the Create Game and Edit Game pages, and both the "sell court" and regular form layouts.

## UI Layout (After Change)

```text
Start Time:   [ 18:00 ]          (scroll picker, same as now)

Duration:     [60 min] [90 min] [120 min]   (toggle chips, 90 default)

Ends at:      19:30              (auto-calculated, read-only text)
```

## Technical Details

### State Changes (both CreateGamePage and EditGamePage)
- Remove `selectedEndTime` and `showEndTimePicker` state variables
- Add `duration` state: `useState<number>(90)` (minutes, default 90)
- Compute end time with a `useMemo`: add `duration` minutes to `selectedTime`
- On form submit, calculate `endDateTime` from start time + duration instead of parsing `selectedEndTime`

### EditGamePage: Loading Existing Data
- When fetching an existing game, calculate the duration by diffing `end_date_time - date_time` in minutes
- Snap to nearest chip value (60/90/120); if it doesn't match exactly, default to the closest one

### UI Changes (both pages, both sell-court and regular layouts)
- Remove the End Time button and its `TimeScrollPicker`
- Replace with a row of 3 toggle-style chips (60 / 90 / 120 min) using simple styled buttons
- Add a small "Ends at HH:MM" label below or beside the duration chips
- The Start Time picker remains unchanged

### Files Modified
1. **src/pages/Games/CreateGamePage.tsx** -- Remove end time state/picker, add duration chips + auto-calculated end time (in both sell-court and regular form sections)
2. **src/pages/Games/EditGamePage.tsx** -- Same changes, plus infer duration from existing game data on load
