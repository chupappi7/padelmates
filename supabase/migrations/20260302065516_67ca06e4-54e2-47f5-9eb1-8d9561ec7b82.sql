
-- Drop existing policies that conflict, then recreate only missing ones
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can view images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;

-- Users can upload images to their own folder
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view chat images (own or from chats they're in)
CREATE POLICY "Chat participants can view images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chats c ON c.id = cm.chat_id
      WHERE cm.message LIKE '%' || storage.filename(name) || '%'
      AND (c.user_1_id = auth.uid() OR c.user_2_id = auth.uid())
    )
  )
);

-- Users can delete own chat images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
