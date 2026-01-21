-- Create skill level enum
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create game format enum
CREATE TYPE public.game_format AS ENUM ('casual_match', 'americano', 'team_americano');

-- Create visibility enum
CREATE TYPE public.visibility_type AS ENUM ('public', 'private', 'club_only');

-- Create request status enum
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    skill_level skill_level NOT NULL DEFAULT 'intermediate',
    bio TEXT,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create clubs table
CREATE TABLE public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create club followers table
CREATE TABLE public.club_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(club_id, user_id)
);

-- Create games table
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    skill_level skill_level NOT NULL DEFAULT 'intermediate',
    max_players INTEGER NOT NULL DEFAULT 8,
    price_per_player DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_instructions TEXT,
    format game_format NOT NULL DEFAULT 'casual_match',
    visibility visibility_type NOT NULL DEFAULT 'public',
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
    scoreboard JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create game players (confirmed players)
CREATE TABLE public.game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(game_id, user_id)
);

-- Create join requests table
CREATE TABLE public.join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    payment_screenshot_url TEXT,
    note TEXT,
    status request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(game_id, user_id)
);

-- Create game messages table
CREATE TABLE public.game_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create club announcements table
CREATE TABLE public.club_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Clubs policies
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Users can create clubs" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their clubs" ON public.clubs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their clubs" ON public.clubs FOR DELETE USING (auth.uid() = owner_id);

-- Club followers policies
CREATE POLICY "Club followers are viewable by everyone" ON public.club_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow clubs" ON public.club_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow clubs" ON public.club_followers FOR DELETE USING (auth.uid() = user_id);

-- Games policies
CREATE POLICY "Public games are viewable by everyone" ON public.games FOR SELECT USING (visibility = 'public' OR host_id = auth.uid());
CREATE POLICY "Users can create games" ON public.games FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their games" ON public.games FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their games" ON public.games FOR DELETE USING (auth.uid() = host_id);

-- Game players policies
CREATE POLICY "Game players are viewable by everyone" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "Host can add players" ON public.game_players FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
);
CREATE POLICY "Host can remove players" ON public.game_players FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
);

-- Join requests policies
CREATE POLICY "Users can view their own requests" ON public.join_requests FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
);
CREATE POLICY "Users can create join requests" ON public.join_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Host can update requests" ON public.join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
);

-- Game messages policies
CREATE POLICY "Game messages are viewable by players" ON public.game_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.game_players WHERE game_id = game_messages.game_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
);
CREATE POLICY "Players can send messages" ON public.game_messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
        EXISTS (SELECT 1 FROM public.game_players WHERE game_id = game_messages.game_id AND user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND host_id = auth.uid())
    )
);

-- Club announcements policies
CREATE POLICY "Announcements are viewable by everyone" ON public.club_announcements FOR SELECT USING (true);
CREATE POLICY "Club owners can create announcements" ON public.club_announcements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND owner_id = auth.uid())
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON public.join_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;

-- Create storage bucket for avatars and payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for payment screenshots
CREATE POLICY "Users can view their own screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own screenshots" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for club logos
CREATE POLICY "Club logos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Club owners can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos');