
-- Fix games SELECT policy to properly handle private and club_only visibility
DROP POLICY "Public games are viewable by everyone" ON public.games;

CREATE POLICY "Games are viewable based on visibility"
ON public.games FOR SELECT
USING (
  visibility = 'public'
  OR host_id = auth.uid()
  OR visibility = 'private'
  OR (visibility = 'club_only' AND club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
);
