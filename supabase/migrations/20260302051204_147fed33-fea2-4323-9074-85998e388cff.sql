
-- Add last_read_at column to track when user last read each conversation
ALTER TABLE public.conversation_preferences
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now();
