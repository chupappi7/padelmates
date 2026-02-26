
-- Add PDR columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pdr_rating double precision,
  ADD COLUMN IF NOT EXISTS pdr_rd double precision NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS pdr_sigma double precision NOT NULL DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS pdr_phase text NOT NULL DEFAULT 'calibrating',
  ADD COLUMN IF NOT EXISTS pdr_matches_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdr_last_match_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pdr_reliability integer NOT NULL DEFAULT 0;

-- Create rating_history table
CREATE TABLE public.rating_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid NOT NULL,
  rating_after double precision NOT NULL,
  rd_after double precision NOT NULL,
  match_id uuid,
  rating_change double precision NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rating history viewable by everyone" ON public.rating_history FOR SELECT USING (true);
CREATE POLICY "System can insert rating history" ON public.rating_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create match_submissions table
CREATE TABLE public.match_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by uuid NOT NULL,
  match_type text NOT NULL DEFAULT 'casual',
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  team_a_player1 uuid NOT NULL,
  team_a_player2 uuid NOT NULL,
  team_b_player1 uuid NOT NULL,
  team_b_player2 uuid NOT NULL,
  set1_a integer NOT NULL,
  set1_b integer NOT NULL,
  set2_a integer NOT NULL,
  set2_b integer NOT NULL,
  set3_a integer,
  set3_b integer,
  status text NOT NULL DEFAULT 'pending',
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  weight double precision NOT NULL DEFAULT 1.0,
  rating_processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '72 hours')
);
ALTER TABLE public.match_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view submissions they are part of" ON public.match_submissions FOR SELECT USING (
  auth.uid() = submitted_by OR
  auth.uid() = team_a_player1 OR auth.uid() = team_a_player2 OR
  auth.uid() = team_b_player1 OR auth.uid() = team_b_player2
);
CREATE POLICY "Users can create submissions" ON public.match_submissions FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Participants can update submissions" ON public.match_submissions FOR UPDATE USING (
  auth.uid() = team_a_player1 OR auth.uid() = team_a_player2 OR
  auth.uid() = team_b_player1 OR auth.uid() = team_b_player2
);

-- Create americano_sessions table
CREATE TABLE public.americano_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hosted_by uuid NOT NULL,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.americano_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions viewable by authenticated" ON public.americano_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create sessions" ON public.americano_sessions FOR INSERT WITH CHECK (auth.uid() = hosted_by);
CREATE POLICY "Hosts can update sessions" ON public.americano_sessions FOR UPDATE USING (auth.uid() = hosted_by);

-- Create americano_rounds table
CREATE TABLE public.americano_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.americano_sessions(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  player1 uuid NOT NULL,
  player2 uuid NOT NULL,
  player3 uuid NOT NULL,
  player4 uuid NOT NULL,
  team_a_points integer NOT NULL,
  team_b_points integer NOT NULL,
  total_points integer NOT NULL
);
ALTER TABLE public.americano_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rounds viewable by authenticated" ON public.americano_rounds FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Session hosts can insert rounds" ON public.americano_rounds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.americano_sessions WHERE id = americano_rounds.session_id AND hosted_by = auth.uid())
);

-- Index for performance
CREATE INDEX idx_rating_history_player ON public.rating_history(player_id);
CREATE INDEX idx_rating_history_created ON public.rating_history(created_at);
CREATE INDEX idx_match_submissions_status ON public.match_submissions(status);
CREATE INDEX idx_match_submissions_players ON public.match_submissions(team_a_player1, team_a_player2, team_b_player1, team_b_player2);
