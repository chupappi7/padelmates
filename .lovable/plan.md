

# Notification Popover (Desktop) + Bottom Drawer (Mobile)

## Overview
Replace the current full-page-only notification experience with a quick-access popover on desktop and a bottom drawer on mobile. The full notifications page remains as a "See all" destination for history.

## What Changes for the User

1. **Desktop** -- clicking the bell icon opens a small dropdown popover showing the latest 5 notifications, with a "See all" link
2. **Mobile** -- clicking the bell icon slides up a bottom drawer (~60% height) with scrollable notifications and a "See all" link
3. The existing `/notifications` page stays as the full history view
4. Each notification is tappable and navigates to the relevant item (friend request, game, etc.)

## User Flow

```text
Desktop:
  [Bell icon] -> Click
  -> Popover drops down (max-h ~350px, scrollable)
  -> Shows latest 5 notifications
  -> [See all notifications] link at bottom -> /notifications page
  -> Click a notification -> navigates to relevant page, popover closes

Mobile:
  [Bell icon] -> Click
  -> Bottom drawer slides up (~60% screen)
  -> Scrollable list of latest notifications
  -> [See all] link at bottom -> /notifications page
  -> Tap a notification -> navigates, drawer closes
```

## Technical Details

### New Component: `NotificationPanel.tsx`

A single component that renders either a Popover (desktop) or a Drawer (mobile) based on the `useIsMobile()` hook -- following the same responsive pattern already used in `MobileFilterSheet` and `FriendPickerSheet`.

Contains:
- Header with "Notifications" title
- ScrollArea with notification items (reuses the same icon/color maps from NotificationsPage)
- "See all" footer link to `/notifications`
- Clicking a notification calls `navigate(n.link)` and closes the panel

### Files Modified

| File | Change |
|------|--------|
| `src/components/layout/NotificationPanel.tsx` | New component: responsive popover/drawer with notification list |
| `src/components/layout/Navbar.tsx` | Replace `navigate("/notifications")` on bell click with opening the NotificationPanel inline |
| `src/pages/Notifications/NotificationsPage.tsx` | No changes -- stays as the full "See all" history page |

### Component Structure

```text
NotificationPanel
  if mobile:
    Drawer (vaul) with DrawerContent
      -> ScrollArea with notification items
      -> "See all" footer
  if desktop:
    Popover (radix) with PopoverContent
      -> ScrollArea with notification items (max-h-[350px])
      -> "See all" footer
```

### Implementation Steps

1. Create `NotificationPanel.tsx` with responsive popover/drawer pattern using `useIsMobile()`
2. Extract notification item rendering into a shared `NotificationItem` sub-component (used by both the panel and the full page)
3. Update `Navbar.tsx` to render `NotificationPanel` around the bell icon instead of navigating on click
4. Keep the badge count on the bell icon as-is

