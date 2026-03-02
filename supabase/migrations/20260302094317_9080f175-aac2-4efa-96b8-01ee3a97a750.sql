
CREATE OR REPLACE FUNCTION public.notify_all_on_public_game()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visibility = 'public' THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT
      p.user_id,
      'announcement',
      'New Game: ' || NEW.title,
      NEW.location || ' · ' || to_char(NEW.date_time AT TIME ZONE 'UTC', 'Mon DD, HH24:MI'),
      '/games/' || NEW.id
    FROM public.profiles p
    WHERE p.user_id <> NEW.host_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_public_game_created
AFTER INSERT ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_on_public_game();
