
-- Add anchor status to profiles for cold-start chain tracking
-- anchored = true means player has played against an established/provisional player
-- whose rating is grounded in the system (not just NR-vs-NR)
ALTER TABLE public.profiles
ADD COLUMN pdr_anchored boolean NOT NULL DEFAULT false;

-- Retroactively anchor all players who are already provisional or established
UPDATE public.profiles
SET pdr_anchored = true
WHERE pdr_phase IN ('provisional', 'established');
