CREATE TRIGGER on_club_announcement_created
AFTER INSERT ON public.club_announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_club_members_on_announcement();