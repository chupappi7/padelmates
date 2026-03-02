
# Add Club Admin Role Management

The club admin system is mostly already built but has some gaps. Here's what needs to be fixed and improved:

## Current State
- The Admin Panel already has a Members tab with "Make Admin" / "Remove Admin" buttons
- The `is_club_admin()` database function already checks both owner and admin roles
- RLS on `club_followers` allows admins to update member records
- However, announcements and club settings RLS only allow **owners**, not admins -- the UI doesn't restrict this, causing silent failures for admins

## Changes

### 1. Update RLS policies for admin access (database migration)
- **club_announcements INSERT**: Allow club admins (not just owners) to create announcements
- **club_announcements DELETE**: Add a DELETE policy for club admins
- **clubs UPDATE**: Allow club admins (not just owners) to update club settings

### 2. Restrict dangerous admin panel actions to owners only
- In `ClubAdminPanel` Settings tab: hide the "Danger Zone" (delete club) section for non-owner admins (already done)
- In `ClubAdminPanel` Members tab: prevent admins from promoting/demoting other admins -- only owners should manage admin roles. Admins should only be able to remove regular members.

### 3. Show admin role management in the public Members tab
- In `ClubMembersTab`: if the current user is the club owner or admin, show a "..." menu on member rows with "Make Admin" option (for regular members) and "Remove Admin" (for admin members, owner only)
- This gives admins quick access to role management without opening the full admin panel

## Technical Details

**Database migration (3 SQL statements):**
- Update `club_announcements` INSERT policy to use `is_club_admin(auth.uid(), club_id)`
- Add `club_announcements` DELETE policy using `is_club_admin(auth.uid(), club_id)`
- Update `clubs` UPDATE policy to use `is_club_admin(auth.uid(), id)`

**Files to modify:**
- `src/components/clubs/ClubMembersTab.tsx` -- add role management actions for owners/admins viewing the public members list
- `src/components/clubs/ClubAdminPanel.tsx` -- restrict admin-on-admin actions to owner only in the Members tab
