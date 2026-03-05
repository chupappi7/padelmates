
CREATE OR REPLACE FUNCTION public.notify_all_on_public_game()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  host_name TEXT;
BEGIN
  IF NEW.visibility = 'public' THEN
    SELECT name INTO host_name FROM public.profiles WHERE user_id = NEW.host_id LIMIT 1;
    
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT
      p.user_id,
      'announcement',
      'New Game: ' || NEW.title,
      COALESCE(host_name, 'Someone') || ' is hosting · ' || NEW.location || ' · ' || to_char(NEW.date_time AT TIME ZONE 'UTC', 'Mon DD, HH24:MI'),
      '/games/' || NEW.id
    FROM public.profiles p
    WHERE p.user_id <> NEW.host_id;
  END IF;
  RETURN NEW;
END;
$function$
