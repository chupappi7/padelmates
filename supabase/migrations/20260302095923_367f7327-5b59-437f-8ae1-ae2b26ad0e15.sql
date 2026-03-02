
CREATE TABLE public.match_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 8),
  created_by uuid NOT NULL,
  expires_at timestamptz,
  use_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.match_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invites" ON public.match_invites FOR SELECT USING (true);
CREATE POLICY "Host can create invites" ON public.match_invites FOR INSERT WITH CHECK (auth.uid() = created_by);
