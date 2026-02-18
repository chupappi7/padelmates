
-- Create chats table for listing-scoped private threads
CREATE TABLE public.chats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  user_1_id uuid NOT NULL,
  user_2_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_1_id, user_2_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create interests table
CREATE TABLE public.interests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- RLS for chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view their chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_messages.chat_id
      AND (user_1_id = auth.uid() OR user_2_id = auth.uid())
    )
  );

CREATE POLICY "Sender can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_messages.chat_id
      AND (user_1_id = auth.uid() OR user_2_id = auth.uid())
    )
  );

-- RLS for interests
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interests viewable by user and host"
  ON public.interests FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.games
      WHERE id = interests.listing_id AND host_id = auth.uid()
    )
  );

CREATE POLICY "Users can express interest"
  ON public.interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update interest status"
  ON public.interests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE id = interests.listing_id AND host_id = auth.uid()
    ) OR auth.uid() = user_id
  );

CREATE POLICY "Users can delete own interest"
  ON public.interests FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interests;
