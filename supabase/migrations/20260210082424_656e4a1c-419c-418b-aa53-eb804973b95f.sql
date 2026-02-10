
CREATE POLICY "Players can join open games"
ON public.game_players
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_players.game_id
    AND games.join_mode = 'open'
  )
);
