

## Consolidate Filters: Move Type Dropdown Into the Mobile Filter Sheet

Right now on mobile there are two filter controls visible: the Type dropdown in the main row AND the filter sheet (which also has Game Format). This is redundant and clutters the UI.

### Approach

**On mobile**: Remove the Type dropdown from the main row entirely. Move it into the MobileFilterSheet alongside Skill Level. The main row will just show a single filter button that opens the sheet with both filters.

**On desktop**: Keep the Type dropdown and Skill Range picker inline as they are today (no sheet needed).

### Changes

**`src/pages/Games/GamesListPage.tsx`**:
- Wrap the `Select` (Type dropdown) in a `!isMobile &&` conditional so it only renders on desktop
- On mobile, the filter row will only contain the `MobileFilterSheet` button (full width)
- Adjust layout: on mobile just render the filter button; on desktop render the dropdown + skill chips side by side

**`src/components/games/MobileFilterSheet.tsx`**:
- No changes needed -- it already contains the Game Format dropdown and Skill Level picker

### Result

- Mobile: One filter icon button that opens a bottom sheet with both Skill Level and Game Format
- Desktop: Type dropdown + Skill chips inline in a row
- No duplicate controls, cleaner mobile UX
