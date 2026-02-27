import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { HeroCard } from "@/components/profile/HeroCard";
import { PDRSection } from "@/components/profile/PDRSection";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { PerformanceStats } from "@/components/profile/PerformanceStats";
import { PastMatches } from "@/components/profile/PastMatches";

interface PublicProfile {
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number | null;
  friend_code: string | null;
  pdr_rating: number | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchStats, setMatchStats] = useState({ played: 0, wins: 0 });
  const [friendshipStatus, setFriendshipStatus] = useState<
    "none" | "pending_sent" | "pending_received" | "accepted"
  >("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    if (user && userId === user.id) {
      navigate("/profile", { replace: true });
    }
  }, [user, userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchMatchStats();
    if (user) fetchFriendshipStatus();
  }, [userId, user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar_url, skill_level, bio, games_played, friend_code, pdr_rating")
      .eq("user_id", userId!)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const fetchMatchStats = async () => {
    const { data: playerRows } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", userId!);
    if (!playerRows || playerRows.length === 0) return;

    const matchIds = playerRows.map((mp) => mp.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status")
      .in("id", matchIds)
      .eq("status", "completed");
    if (!matchesData) return;

    let wins = 0;
    matchesData.forEach((m) => {
      const mp = playerRows.find((p) => p.match_id === m.id);
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

  const fetchFriendshipStatus = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (!data) {
      setFriendshipStatus("none");
      setFriendshipId(null);
      return;
    }
    setFriendshipId(data.id);
    if (data.status === "accepted") {
      setFriendshipStatus("accepted");
    } else if (data.requester_id === user.id) {
      setFriendshipStatus("pending_sent");
    } else {
      setFriendshipStatus("pending_received");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
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

  const losses = matchStats.played - matchStats.wins;
  const winRate =
    matchStats.played > 0
      ? Math.round((matchStats.wins / matchStats.played) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* 1️⃣ Hero Card */}
          <HeroCard
            name={profile.name}
            avatarUrl={profile.avatar_url}
            skillLevel={profile.skill_level}
            friendCode={profile.friend_code}
            pdrRating={profile.pdr_rating}
            isSelf={false}
          />

          {/* 3️⃣ Action Buttons */}
          {user && userId && (
            <ProfileActionButtons
              currentUserId={user.id}
              targetUserId={userId}
              friendshipStatus={friendshipStatus}
              friendshipId={friendshipId}
              loading={friendActionLoading}
              onFriendshipChange={() => {
                setFriendActionLoading(true);
                fetchFriendshipStatus().finally(() =>
                  setFriendActionLoading(false)
                );
              }}
            />
          )}

          {/* 5️⃣ Performance Stats */}
          <PerformanceStats
            matches={matchStats.played || profile.games_played || 0}
            wins={matchStats.wins}
            losses={losses}
            winRate={winRate}
          />

          {/* 6️⃣ Past Matches */}
          {userId && <PastMatches userId={userId} />}
        </motion.div>
      </div>
    </div>
  );
}
