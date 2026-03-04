

## Plan: Club Announcements with Image Uploads and Member Notifications

### Current State
- `club_announcements` table has: `id`, `club_id`, `author_id`, `title`, `content`, `created_at` -- no image support
- Admin panel has a basic announcement form (title + body text only)
- Feed tab displays announcements as text cards
- No notification is sent to members when an announcement is posted

### Changes Required

#### 1. Database Migration
- Add `image_url` (text, nullable) column to `club_announcements` table
- Create a `club-announcements` storage bucket (public) with RLS policies for admin uploads
- Create a database trigger/function that inserts a notification for each active club member when a new announcement is created

#### 2. Update Announcement Form (ClubAdminPanel.tsx - AnnouncementsTab)
- Add image picker button (camera icon) below the text fields
- Upload selected image to `club-announcements` bucket on post
- Save the public URL in the new `image_url` column
- Show image preview before posting with remove option

#### 3. Update Feed Display (ClubFeedTab.tsx)
- Read `image_url` from announcements data
- Render the image below the announcement text (rounded, full-width) when present

#### 4. Notify Members on Announcement Post
- Database trigger `notify_club_members_on_announcement`: on INSERT to `club_announcements`, insert a notification row for each active member of the club (excluding the author)
- Notification type: `"announcement"`, with title like "New Post in [Club Name]", message = announcement title, link = `/clubs/{club_id}`

### Technical Details

**Storage bucket SQL:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('club-announcements', 'club-announcements', true);
-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload announcement images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'club-announcements');
CREATE POLICY "Public read announcement images" ON storage.objects FOR SELECT USING (bucket_id = 'club-announcements');
```

**Trigger function SQL:**
```sql
CREATE OR REPLACE FUNCTION public.notify_club_members_on_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
```

**Files to modify:**
- `src/components/clubs/ClubAdminPanel.tsx` -- add image upload to AnnouncementsTab
- `src/components/clubs/ClubFeedTab.tsx` -- render announcement images

