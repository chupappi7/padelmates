
-- Allow authenticated users to upload chat images to payment-screenshots bucket
CREATE POLICY "Users can upload chat images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'chat'
);

-- Allow chat participants to view chat images
CREATE POLICY "Users can view chat images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots'
  AND auth.uid() IS NOT NULL
);
