
-- Add elo_rating column to profiles
ALTER TABLE public.profiles ADD COLUMN elo_rating integer NOT NULL DEFAULT 1200;

-- Create elo_history table
CREATE TABLE public.elo_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  old_rating integer NOT NULL,
  new_rating integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read elo history (public leaderboard)
CREATE POLICY "ELO history is viewable by everyone"
  ON public.elo_history FOR SELECT
  USING (true);

-- Only authenticated users can insert (for score submission)
CREATE POLICY "Authenticated users can insert elo history"
  ON public.elo_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
