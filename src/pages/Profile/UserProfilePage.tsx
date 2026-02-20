import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Swords, Percent, Users, MessageCircle, UserPlus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

interface PublicProfile {
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number | null;
  friend_code: string | null;
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex-1 bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-1 min-w-0">
      <div className="text-primary">{icon}</div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchStats, setMatchStats] = useState({ played: 0, wins: 0 });
  const [friendCount, setFriendCount] = useState(0);
  const [friendshipStatus, setFriendshipStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

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
    if (user) fetchFriendshipStatus();
  }, [userId, user]);

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

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: userId,
    } as any);
    if (error) {
      toast.error("Failed to send friend request");
    } else {
      toast.success("Friend request sent!");
      fetchFriendshipStatus();
    }
    setFriendActionLoading(false);
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
    if (error) {
      toast.error("Failed to remove friend");
    } else {
      toast("Friend removed");
      fetchFriendshipStatus();
      fetchFriendCount();
    }
    setFriendActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-xl" />
            <div className="h-24 bg-muted rounded-xl" />
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
          className="space-y-4"
        >
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* ── Identity Header ── */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {profile.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl font-bold leading-tight">
                  {profile.name}
                </h1>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <SkillBadge level={profile.skill_level} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {friendCount} friends
                  </span>
                </div>
                {profile.bio && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* CTAs */}
                {user && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="hero"
                      className="flex-1 text-xs h-8 gap-1.5"
                      onClick={() => navigate(`/messages/${userId}`)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Message
                    </Button>

                    {friendshipStatus === "none" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 gap-1.5"
                        onClick={handleAddFriend}
                        disabled={friendActionLoading}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Friend
                      </Button>
                    )}
                    {friendshipStatus === "pending_sent" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 gap-1.5"
                        disabled
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Request Sent
                      </Button>
                    )}
                    {friendshipStatus === "pending_received" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 gap-1.5"
                        onClick={handleAddFriend}
                        disabled={friendActionLoading}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Accept
                      </Button>
                    )}
                    {friendshipStatus === "accepted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8 gap-1.5 text-muted-foreground"
                        onClick={handleRemoveFriend}
                        disabled={friendActionLoading}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Friends
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="flex gap-2">
            <StatCard
              icon={<Swords className="w-4 h-4" />}
              value={matchStats.played || profile.games_played || 0}
              label="Matches"
            />
            <StatCard
              icon={<Trophy className="w-4 h-4" />}
              value={matchStats.wins}
              label="Wins"
            />
            <StatCard
              icon={<Percent className="w-4 h-4" />}
              value={`${winRate}%`}
              label="Win Rate"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              value={friendCount}
              label="Friends"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
