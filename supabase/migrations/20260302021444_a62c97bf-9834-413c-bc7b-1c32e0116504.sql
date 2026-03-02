
-- 1. Update club_announcements INSERT policy to allow admins
DROP POLICY IF EXISTS "Club owners can create announcements" ON public.club_announcements;
CREATE POLICY "Club admins can create announcements"
ON public.club_announcements
FOR INSERT
TO authenticated
WITH CHECK (is_club_admin(auth.uid(), club_id));

-- 2. Add DELETE policy for club_announcements
CREATE POLICY "Club admins can delete announcements"
ON public.club_announcements
FOR DELETE
TO authenticated
USING (is_club_admin(auth.uid(), club_id));

-- 3. Update clubs UPDATE policy to allow admins
DROP POLICY IF EXISTS "Owners can update their clubs" ON public.clubs;
CREATE POLICY "Club admins can update their clubs"
ON public.clubs
FOR UPDATE
TO authenticated
USING (is_club_admin(auth.uid(), id));
