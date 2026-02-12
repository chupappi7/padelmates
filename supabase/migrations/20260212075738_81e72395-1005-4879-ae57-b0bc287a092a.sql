
-- Add end_date_time column to games table (nullable, since existing games don't have it)
ALTER TABLE public.games ADD COLUMN end_date_time timestamp with time zone;
