
-- Add booking_screenshot_url column to games table
ALTER TABLE public.games 
ADD COLUMN booking_screenshot_url TEXT DEFAULT NULL;

-- Create booking-proofs storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('booking-proofs', 'booking-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Upload policy: authenticated users can upload
CREATE POLICY "Hosts can upload booking proofs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL
);

-- View policy: authenticated users can view
CREATE POLICY "Users can view booking proofs" ON storage.objects
FOR SELECT USING (bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL);

-- Update policy: hosts can replace their proofs
CREATE POLICY "Hosts can update booking proofs" ON storage.objects
FOR UPDATE USING (bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL);

-- Delete policy: hosts can delete their proofs
CREATE POLICY "Hosts can delete booking proofs" ON storage.objects
FOR DELETE USING (bucket_id = 'booking-proofs' AND auth.uid() IS NOT NULL);
