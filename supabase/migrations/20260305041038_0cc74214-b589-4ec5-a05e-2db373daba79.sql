
-- Validate notification links are internal paths only (prevents phishing)
CREATE OR REPLACE FUNCTION public.validate_notification_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow NULL links
  IF NEW.link IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only allow relative paths starting with /
  IF NEW.link NOT LIKE '/%' THEN
    RAISE EXCEPTION 'Notification link must be a relative path starting with /';
  END IF;
  
  -- Block any protocol-like patterns within the path
  IF NEW.link ~ '://' THEN
    RAISE EXCEPTION 'Notification link cannot contain external URLs';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_notification_link_trigger
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_notification_link();
