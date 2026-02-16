ALTER TABLE public.games
ADD COLUMN prefilled_players jsonb NOT NULL DEFAULT '[]'::jsonb;