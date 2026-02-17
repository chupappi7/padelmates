
-- Add friend_code column
ALTER TABLE public.profiles ADD COLUMN friend_code TEXT UNIQUE;

-- Function to generate random 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  i INT;
  attempts INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * 36 + 1)::int, 1);
    END LOOP;
    
    -- Check uniqueness
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = code) THEN
      NEW.friend_code := code;
      RETURN NEW;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique friend code after 20 attempts';
    END IF;
  END LOOP;
END;
$$;

-- Trigger for new profiles
CREATE TRIGGER set_friend_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.friend_code IS NULL)
EXECUTE FUNCTION public.generate_friend_code();

-- Backfill existing profiles
DO $$
DECLARE
  r RECORD;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE friend_code IS NULL LOOP
    LOOP
      code := '';
      FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * 36 + 1)::int, 1);
      END LOOP;
      BEGIN
        UPDATE public.profiles SET friend_code = code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- retry
      END;
    END LOOP;
  END LOOP;
END;
$$;
