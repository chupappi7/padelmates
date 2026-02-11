
-- Add role column to game_players
ALTER TABLE public.game_players 
ADD COLUMN role text NOT NULL DEFAULT 'player' 
CHECK (role IN ('player', 'admin'));

-- Create a security definer function to check if user is game admin or host
CREATE OR REPLACE FUNCTION public.is_game_admin(_user_id uuid, _game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games WHERE id = _game_id AND host_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.game_players WHERE game_id = _game_id AND user_id = _user_id AND role = 'admin'
  )
$$;

-- Update game update policy to allow admins too
DROP POLICY IF EXISTS "Hosts can update their games" ON public.games;
CREATE POLICY "Hosts and admins can update their games"
ON public.games
FOR UPDATE
USING (public.is_game_admin(auth.uid(), id));

-- Allow admins to add players (in addition to hosts)
DROP POLICY IF EXISTS "Host can add players" ON public.game_players;
CREATE POLICY "Host and admins can add players"
ON public.game_players
FOR INSERT
WITH CHECK (
  public.is_game_admin(auth.uid(), game_id) 
  OR (auth.uid() = user_id AND EXISTS (SELECT 1 FROM games WHERE id = game_id AND join_mode = 'open'))
);

-- Allow admins to remove players (in addition to hosts)
DROP POLICY IF EXISTS "Host can remove players" ON public.game_players;
CREATE POLICY "Host and admins can remove players"
ON public.game_players
FOR DELETE
USING (public.is_game_admin(auth.uid(), game_id));

-- Allow host and admins to update player roles
CREATE POLICY "Host and admins can update players"
ON public.game_players
FOR UPDATE
USING (public.is_game_admin(auth.uid(), game_id));

-- Update join request policies to allow admins
DROP POLICY IF EXISTS "Host can update requests" ON public.join_requests;
CREATE POLICY "Host and admins can update requests"
ON public.join_requests
FOR UPDATE
USING (
  public.is_game_admin(auth.uid(), game_id) 
  OR auth.uid() = user_id
);
