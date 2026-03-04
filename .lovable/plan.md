

## Plan: Add match count labels to Activity chart bars

**File:** `src/components/profile/tabs/ProfileDashboardTab.tsx`

Add a `LabelList` from recharts to the `Bar` component to display the numeric count on top of each bar. Only show the label when count > 0.

**Change (lines 232-239):**
- Import `LabelList` from recharts
- Add `<LabelList>` inside the `<Bar>` component with `position="top"`, small font size, and conditional rendering (hide when value is 0)

