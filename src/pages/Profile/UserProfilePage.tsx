import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, History } from "lucide-react";
import { HeroCard } from "@/components/profile/HeroCard";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileClubs } from "@/components/profile/ProfileClubs";
import { LifetimeCredits } from "@/components/profile/LifetimeCredits";

interface PublicProfile {
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number | null;
  friend_code: string | null;
  pdr_rating: number | null;
  region: string | null;
  sex: string | null;
  birth_year: number | null;
  preferred_position: string | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
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
    if (user) fetchFriendshipStatus();
  }, [userId, user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("name, avatar_url, skill_level, bio, games_played, friend_code, pdr_rating, region, sex, birth_year, preferred_position")
      .eq("user_id", userId!)
      .single();
    setProfile(data as unknown as PublicProfile);
    setLoading(false);
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

  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;

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

          {/* Hero Card */}
          <HeroCard
            name={profile.name}
            avatarUrl={profile.avatar_url}
            skillLevel={profile.skill_level}
            friendCode={profile.friend_code}
            pdrRating={profile.pdr_rating}
            isSelf={false}
          />

          {/* Action Buttons */}
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

          {/* Personal Details */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Details</h3>
            {profile.region && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <span className="text-foreground">{profile.region}</span>
              </div>
            )}
            {profile.preferred_position && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position</span>
                <span className="text-foreground capitalize">{profile.preferred_position} side</span>
              </div>
            )}
            {profile.sex && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Sex</span>
                <span className={`font-semibold ${profile.sex === "female" ? "text-[hsl(330,70%,60%)]" : "text-[hsl(210,70%,55%)]"}`}>
                  {profile.sex === "female" ? "F" : profile.sex === "male" ? "M" : profile.sex.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {age && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Age</span>
                <span className="text-foreground">{age}</span>
              </div>
            )}
          </div>

          {/* Match History Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => navigate(`/match-history/${userId}`)}
          >
            <History className="w-4 h-4" />
            Match History
          </Button>

          {/* Lifetime Credits */}
          {userId && <LifetimeCredits userId={userId} />}

          {/* Clubs */}
          {userId && <ProfileClubs userId={userId} />}
        </motion.div>
      </div>
    </div>
  );
}
