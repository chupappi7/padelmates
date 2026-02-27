
-- Add new columns to clubs table
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS num_courts integer,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- Add role and status columns to club_followers (acts as club_members)
ALTER TABLE public.club_followers
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create a security definer function to check club roles
CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = _club_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.club_followers 
    WHERE club_id = _club_id AND user_id = _user_id AND role = 'admin' AND status = 'active'
  )
$$;

-- Create function to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_followers 
    WHERE club_id = _club_id AND user_id = _user_id AND status = 'active'
  )
$$;

-- Update RLS: admins can update member roles
CREATE POLICY "Club admins can update members"
ON public.club_followers
FOR UPDATE
USING (is_club_admin(auth.uid(), club_id));

-- Update existing owner records to have 'owner' role
UPDATE public.club_followers cf
SET role = 'owner'
FROM public.clubs c
WHERE cf.club_id = c.id AND cf.user_id = c.owner_id;
