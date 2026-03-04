
CREATE POLICY "Club admins can update announcements" ON public.club_announcements
FOR UPDATE TO authenticated
USING (is_club_admin(auth.uid(), club_id))
WITH CHECK (is_club_admin(auth.uid(), club_id));
