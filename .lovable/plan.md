

## Flatten the Host Button into a Regular Tab

The raised circular FAB (Floating Action Button) feels visually disconnected with 5 tabs. The fix is to make "Host" a normal tab item like the rest, but keep it visually distinct using the primary color.

### What changes

**File: `src/components/layout/BottomTabBar.tsx`**

- Remove the `isFab: true` flag from the Host tab definition
- Remove the special FAB rendering branch (the `-mt-5`, `w-14 h-14 rounded-full` circle)
- Render "Host" as a standard tab with the `Plus` icon, same as Matches/Clubs/My Matches/Profile
- The `Plus` icon will use the primary color (teal) regardless of active state to keep it visually prominent

### Result

All 5 tabs render uniformly in a single row: same icon size, same label style, same vertical alignment. The Host tab stands out via its teal-colored icon, making it easy to find without the visual bulk of the floating circle.

### Technical details

Remove the `isFab` property and the conditional rendering block. All tabs follow the same render path. For the Host tab specifically, force `text-primary` on the icon so it always appears teal (not gray).

