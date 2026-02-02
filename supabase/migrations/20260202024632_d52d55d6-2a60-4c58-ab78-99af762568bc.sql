-- Add storage policies for payment-screenshots bucket
-- Users can upload their own payment screenshots
CREATE POLICY "Users can upload their own payment screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own payment screenshots
CREATE POLICY "Users can view their own payment screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Game hosts can view payment screenshots for their games
CREATE POLICY "Hosts can view payment screenshots for their games"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots' 
  AND EXISTS (
    SELECT 1 FROM join_requests jr
    JOIN games g ON g.id = jr.game_id
    WHERE jr.payment_screenshot_url LIKE '%' || name || '%'
    AND g.host_id = auth.uid()
  )
);

-- Users can update their own payment screenshots
CREATE POLICY "Users can update their own payment screenshots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'payment-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also update join_requests policy to allow users to update their own payment info
CREATE POLICY "Users can update their own payment info"
ON public.join_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);