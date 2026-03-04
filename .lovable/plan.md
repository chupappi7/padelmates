

## Fix: Notification badge not clearing on "Mark all read"

### Problem
When `markAllAsRead` runs, it optimistically sets all notifications to `read: true` (badge disappears). But the subsequent DB update triggers the realtime subscription, which calls `fetchNotifications()` — this re-fetches from the database and can briefly return stale unread rows, overwriting the optimistic state and making the badge reappear.

### Solution (single file: `src/hooks/useNotifications.ts`)

Add a short debounce/guard so the realtime-triggered refetch doesn't overwrite optimistic updates:

1. **Add a `skipNextRefetch` ref** — set it to `true` right before the DB update in `markAllAsRead` (and `markAsRead`)
2. **In the realtime callback**, check `skipNextRefetch.current` — if true, reset it and skip the refetch
3. This lets the optimistic state stick while the DB catches up; the *next* realtime event (e.g. a new notification) will refetch normally

```typescript
const skipNextRefetch = useRef(false);

// In realtime callback:
() => {
  if (skipNextRefetch.current) {
    skipNextRefetch.current = false;
    return;
  }
  fetchNotifications();
}

// In markAllAsRead:
skipNextRefetch.current = true;
await supabase.from("notifications").update({ read: true })...
```

This is a minimal, targeted fix — no UI changes needed since the badge logic (`unreadCount > 0`) is already correct.

