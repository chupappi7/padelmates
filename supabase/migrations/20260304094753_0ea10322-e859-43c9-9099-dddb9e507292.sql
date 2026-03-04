
-- Americano tournament config (one per game)
CREATE TABLE public.americano_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  courts integer NOT NULL DEFAULT 1,
  points_per_match integer NOT NULL DEFAULT 24,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id)
);

ALTER TABLE public.americano_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config viewable by everyone" ON public.americano_config
  FOR SELECT USING (true);

CREATE POLICY "Host can insert config" ON public.americano_config
  FOR INSERT WITH CHECK (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can update config" ON public.americano_config
  FOR UPDATE USING (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can delete config" ON public.americano_config
  FOR DELETE USING (is_game_admin(auth.uid(), game_id));

-- Americano matches (individual court matches within rounds)
CREATE TABLE public.americano_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  court_number integer NOT NULL DEFAULT 1,
  team1_player1 uuid NOT NULL,
  team1_player2 uuid NOT NULL,
  team2_player1 uuid NOT NULL,
  team2_player2 uuid NOT NULL,
  team1_score integer,
  team2_score integer,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.americano_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Americano matches viewable by everyone" ON public.americano_matches
  FOR SELECT USING (true);

CREATE POLICY "Host can insert americano matches" ON public.americano_matches
  FOR INSERT WITH CHECK (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can update americano matches" ON public.americano_matches
  FOR UPDATE USING (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can delete americano matches" ON public.americano_matches
  FOR DELETE USING (is_game_admin(auth.uid(), game_id));

-- Americano standings (live per-player stats)
CREATE TABLE public.americano_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  ties integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  points_for integer NOT NULL DEFAULT 0,
  points_against integer NOT NULL DEFAULT 0,
  matches_played integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

ALTER TABLE public.americano_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings viewable by everyone" ON public.americano_standings
  FOR SELECT USING (true);

CREATE POLICY "Host can insert standings" ON public.americano_standings
  FOR INSERT WITH CHECK (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can update standings" ON public.americano_standings
  FOR UPDATE USING (is_game_admin(auth.uid(), game_id));

CREATE POLICY "Host can delete standings" ON public.americano_standings
  FOR DELETE USING (is_game_admin(auth.uid(), game_id));

-- Enable realtime for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.americano_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.americano_standings;
