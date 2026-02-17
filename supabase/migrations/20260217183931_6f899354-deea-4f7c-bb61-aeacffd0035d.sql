
-- Add court_taken_by to games (who secured the court)
ALTER TABLE public.games ADD COLUMN court_taken_by uuid DEFAULT NULL;

-- Create court_messages table for 1-on-1 DMs between interested user and host
CREATE TABLE public.court_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.court_messages ENABLE ROW LEVEL SECURITY;

-- Only sender and recipient can view their DMs for a game
CREATE POLICY "Users can view their own court DMs"
ON public.court_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Authenticated users can send DMs (must be sender)
CREATE POLICY "Users can send court DMs"
ON public.court_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for court_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.court_messages;
