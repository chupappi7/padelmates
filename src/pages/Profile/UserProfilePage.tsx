import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Trophy, Users } from "lucide-react";

interface PublicProfile {
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number | null;
  friend_code: string | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchStats, setMatchStats] = useState({ played: 0, wins: 0 });
  const [friendCount, setFriendCount] = useState(0);

  // Redirect to own profile page if viewing self
  useEffect(() => {
    if (user && userId === user.id) {
      navigate("/profile", { replace: true });
    }
  }, [user, userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchMatchStats();
    fetchFriendCount();
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar_url, skill_level, bio, games_played, friend_code")
      .eq("user_id", userId!)
      .single();

    setProfile(data);
    setLoading(false);
  };

  const fetchMatchStats = async () => {
    const { data: myMatchPlayers } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", userId!);

    if (!myMatchPlayers || myMatchPlayers.length === 0) return;

    const matchIds = myMatchPlayers.map((mp) => mp.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status")
      .in("id", matchIds)
      .eq("status", "completed");

    if (!matchesData) return;

    let wins = 0;
    matchesData.forEach((m) => {
      const mp = myMatchPlayers.find((p) => p.match_id === m.id);
      if (!mp) return;
      if (
        (mp.team === 1 && (m.team1_score ?? 0) > (m.team2_score ?? 0)) ||
        (mp.team === 2 && (m.team2_score ?? 0) > (m.team1_score ?? 0))
      ) {
        wins++;
      }
    });

    setMatchStats({ played: matchesData.length, wins });
  };

  const fetchFriendCount = async () => {
    const { count } = await supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    setFriendCount(count || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 w-32 bg-muted rounded-full mx-auto" />
            <div className="h-8 w-48 bg-muted rounded mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-6">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {profile.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <h1 className="font-display text-2xl font-bold mb-2">{profile.name}</h1>
            <div className="flex justify-center mb-4">
              <SkillBadge level={profile.skill_level} />
            </div>
            {profile.bio && (
              <p className="text-muted-foreground mb-4">{profile.bio}</p>
            )}
            {profile.friend_code && (
              <div className="inline-flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
                <span className="text-xs text-muted-foreground font-medium">Friend Code</span>
                <code className="text-sm font-mono font-bold tracking-widest">{profile.friend_code}</code>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{matchStats.played || profile.games_played || 0}</p>
              <p className="text-sm text-muted-foreground">Matches</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{matchStats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{friendCount}</p>
              <p className="text-sm text-muted-foreground">Friends</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
