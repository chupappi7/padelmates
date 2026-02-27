
-- Add allow_substitutions column to games table
ALTER TABLE public.games ADD COLUMN allow_substitutions boolean NOT NULL DEFAULT false;
