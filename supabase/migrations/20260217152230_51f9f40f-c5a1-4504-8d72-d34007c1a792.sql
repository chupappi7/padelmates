-- Allow players to remove themselves from a game
CREATE POLICY "Players can leave games"
ON public.game_players
FOR DELETE
USING (auth.uid() = user_id);

-- Allow players to delete their own join requests
CREATE POLICY "Users can delete own join requests"
ON public.join_requests
FOR DELETE
USING (auth.uid() = user_id);
