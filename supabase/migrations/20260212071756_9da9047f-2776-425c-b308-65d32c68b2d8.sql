-- Add set_scores jsonb column to store per-set game scores
-- Format: [{"t1": 6, "t2": 4}, {"t1": 3, "t2": 6}, {"t1": 7, "t2": 6}]
-- team1_score and team2_score will store total sets won
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS set_scores jsonb DEFAULT '[]'::jsonb;