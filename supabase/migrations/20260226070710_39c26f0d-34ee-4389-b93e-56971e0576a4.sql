
-- Add pdr_internal_rating to profiles (internal placeholder used for NR vs NR calculations)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pdr_internal_rating double precision NOT NULL DEFAULT 3.0;

-- Add internal_rating_after to rating_history
ALTER TABLE public.rating_history
ADD COLUMN IF NOT EXISTS internal_rating_after double precision;
