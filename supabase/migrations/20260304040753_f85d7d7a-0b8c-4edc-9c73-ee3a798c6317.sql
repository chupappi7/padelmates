
CREATE TABLE public.match_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  giver_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  credit_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, giver_id)
);

CREATE INDEX ON public.match_credits(match_id);
CREATE INDEX ON public.match_credits(receiver_id);

ALTER TABLE public.match_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credits viewable by everyone"
ON public.match_credits FOR SELECT
USING (true);

CREATE POLICY "Players can give credits"
ON public.match_credits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = giver_id AND giver_id != receiver_id);
