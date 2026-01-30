-- Add host_is_playing field to games table
ALTER TABLE public.games ADD COLUMN host_is_playing boolean NOT NULL DEFAULT true;