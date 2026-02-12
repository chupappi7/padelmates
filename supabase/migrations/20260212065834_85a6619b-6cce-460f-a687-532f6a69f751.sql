
-- Matches within a game (e.g. multiple rounds)
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Players assigned to each match with their team
CREATE TABLE public.match_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team INTEGER NOT NULL CHECK (team IN (1, 2)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Matches viewable by everyone
CREATE POLICY "Matches are viewable by everyone"
ON public.matches FOR SELECT USING (true);

-- Host/admins can create matches
CREATE POLICY "Host and admins can create matches"
ON public.matches FOR INSERT
WITH CHECK (is_game_admin(auth.uid(), game_id));

-- Host/admins can update matches (scores)
CREATE POLICY "Host and admins can update matches"
ON public.matches FOR UPDATE
USING (is_game_admin(auth.uid(), game_id));

-- Host/admins can delete matches
CREATE POLICY "Host and admins can delete matches"
ON public.matches FOR DELETE
USING (is_game_admin(auth.uid(), game_id));

-- Match players viewable by everyone
CREATE POLICY "Match players are viewable by everyone"
ON public.match_players FOR SELECT USING (true);

-- Host/admins can manage match players
CREATE POLICY "Host and admins can add match players"
ON public.match_players FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.matches m WHERE m.id = match_players.match_id AND is_game_admin(auth.uid(), m.game_id)
));

CREATE POLICY "Host and admins can delete match players"
ON public.match_players FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.matches m WHERE m.id = match_players.match_id AND is_game_admin(auth.uid(), m.game_id)
));

-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_players;
