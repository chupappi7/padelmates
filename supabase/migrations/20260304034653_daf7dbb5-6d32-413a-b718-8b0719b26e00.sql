
-- Replace simple likes with emoji reactions
-- Add emoji column to announcement_likes
ALTER TABLE public.announcement_likes ADD COLUMN emoji text NOT NULL DEFAULT '❤️';

-- Drop unique constraint and recreate to include emoji
ALTER TABLE public.announcement_likes DROP CONSTRAINT announcement_likes_announcement_id_user_id_key;
ALTER TABLE public.announcement_likes ADD CONSTRAINT announcement_likes_unique_reaction UNIQUE (announcement_id, user_id, emoji);
