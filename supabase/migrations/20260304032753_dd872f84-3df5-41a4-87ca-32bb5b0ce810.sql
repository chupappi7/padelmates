
-- Add image_url column to club_announcements
ALTER TABLE public.club_announcements ADD COLUMN image_url text;

-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('club-announcements', 'club-announcements', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Users can upload announcement images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'club-announcements');

-- Storage RLS: public read
CREATE POLICY "Public read announcement images" ON storage.objects FOR SELECT USING (bucket_id = 'club-announcements');

-- Trigger function to notify club members on new announcement
CREATE OR REPLACE FUNCTION public.notify_club_members_on_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  club_name TEXT;
  member RECORD;
BEGIN
  SELECT name INTO club_name FROM public.clubs WHERE id = NEW.club_id;
  FOR member IN
    SELECT user_id FROM public.club_followers
    WHERE club_id = NEW.club_id AND status = 'active' AND user_id != NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link, read)
    VALUES (member.user_id, 'announcement', 'New Post in ' || club_name, NEW.title, '/clubs/' || NEW.club_id, false);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_club_announcement_insert
  AFTER INSERT ON public.club_announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_club_members_on_announcement();
