
-- Add slug column
ALTER TABLE public.games ADD COLUMN slug text UNIQUE;

-- Create function to auto-generate slug
CREATE OR REPLACE FUNCTION public.generate_game_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_slug TEXT;
  i INT;
  attempts INT := 0;
BEGIN
  IF NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  LOOP
    new_slug := '';
    FOR i IN 1..6 LOOP
      new_slug := new_slug || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = new_slug) THEN
      NEW.slug := new_slug;
      RETURN NEW;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique game slug after 20 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Create trigger
CREATE TRIGGER generate_game_slug_trigger
BEFORE INSERT ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.generate_game_slug();

-- Backfill existing games with slugs
DO $$
DECLARE
  r RECORD;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_slug TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id FROM public.games WHERE slug IS NULL LOOP
    LOOP
      new_slug := '';
      FOR i IN 1..6 LOOP
        new_slug := new_slug || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      BEGIN
        UPDATE public.games SET slug = new_slug WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry
      END;
    END LOOP;
  END LOOP;
END;
$$;
