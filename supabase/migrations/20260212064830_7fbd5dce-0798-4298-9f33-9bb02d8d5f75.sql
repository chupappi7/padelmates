
-- Change skill_level from enum to integer in games table
ALTER TABLE public.games 
  ALTER COLUMN skill_level DROP DEFAULT,
  ALTER COLUMN skill_level TYPE integer USING 
    CASE skill_level::text
      WHEN 'beginner' THEN 2
      WHEN 'intermediate' THEN 3
      WHEN 'advanced' THEN 5
    END,
  ALTER COLUMN skill_level SET DEFAULT 3;

-- Add check constraint for valid range
ALTER TABLE public.games ADD CONSTRAINT games_skill_level_range CHECK (skill_level >= 2 AND skill_level <= 5);

-- Change skill_level from enum to integer in profiles table
ALTER TABLE public.profiles 
  ALTER COLUMN skill_level DROP DEFAULT,
  ALTER COLUMN skill_level TYPE integer USING 
    CASE skill_level::text
      WHEN 'beginner' THEN 2
      WHEN 'intermediate' THEN 3
      WHEN 'advanced' THEN 5
    END,
  ALTER COLUMN skill_level SET DEFAULT 3;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_skill_level_range CHECK (skill_level >= 2 AND skill_level <= 5);

-- Drop the old enum type (if not used elsewhere)
DROP TYPE IF EXISTS public.skill_level;
