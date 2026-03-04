import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Target, Hand, Users, Cake, ChevronDown, ChevronUp } from "lucide-react";
import { SkillBadge } from "@/components/games/SkillBadge";
import { ProfileActionButtons } from "@/components/profile/ProfileActionButtons";
import { ProfileDashboardTab } from "@/components/profile/tabs/ProfileDashboardTab";
import { ProfileMatchesTab } from "@/components/profile/tabs/ProfileMatchesTab";
import { ProfileAnalysisTab } from "@/components/profile/tabs/ProfileAnalysisTab";
import { ProfileCreditsTab } from "@/components/profile/tabs/ProfileCreditsTab";
import { ProfileClubsGlass } from "@/components/profile/tabs/ProfileClubsGlass";
import { LifetimeCredits } from "@/components/profile/LifetimeCredits";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getRegionLabel } from "@/lib/regions";
import { Copy, Check } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

const TABS = ["Dashboard", "Matches", "Analysis", "Credits"] as const;
type Tab = typeof TABS[number];

interface PublicProfile {
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number | null;
  friend_code: string | null;
  pdr_rating: number | null;
  pdr_phase: string;
  region: string | null;
  sex: string | null;
  birth_year: number | null;
  preferred_position: string | null;
  preferred_hand: string | null;
  created_at: string;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
      .select("name, avatar_url, skill_level, bio, games_played, friend_code, pdr_rating, pdr_phase, region, sex, birth_year, preferred_position, preferred_hand, created_at")
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

  const handleCopyCode = () => {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[#E2E8F0] rounded-2xl" />
            <div className="h-16 bg-[#E2E8F0] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="container py-16 text-center">
          <p className="text-[#64748B]">User not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const genderLabel = (val: string | null) => {
    if (!val) return null;
    if (val === "male") return "Male";
    if (val === "female") return "Female";
    return "Other";
  };

  const detailFields = [
    { icon: MapPin, label: "Location", value: profile.region ? getRegionLabel(profile.region) : null, full: true },
    { icon: Cake, label: "Age", value: age ? String(age) : null },
    { icon: Users, label: "Gender", value: genderLabel(profile.sex) },
    { icon: Target, label: "Position", value: profile.preferred_position ? `${profile.preferred_position === "left" ? "Left" : "Right"} Side` : null },
    { icon: Hand, label: "Hand", value: profile.preferred_hand ? (profile.preferred_hand === "left" ? "Left" : "Right") : null },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-teal-50 to-white px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F172A]" />
          </button>
          <h1 className="text-[#0F172A] font-bold text-lg" style={{ fontFamily: SPACE }}>Profile</h1>
          <div className="w-9" />
        </div>

        {/* Avatar + Name */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-2 pb-4"
        >
          <Avatar className="w-20 h-20 ring-2 ring-[#14b8a6]/20 ring-offset-2 ring-offset-white">
            <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold bg-[#14b8a6]/10 text-[#14b8a6]" style={{ fontFamily: SPACE }}>
              {profile.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <p className="text-[#0F172A] text-xl font-bold mt-3" style={{ fontFamily: SPACE }}>{profile.name}</p>

          <div className="flex items-center gap-2 mt-1.5">
            <SkillBadge level={profile.skill_level || 2} size="sm" />
            {profile.friend_code && (
              <>
                <span className="text-[#CBD5E1] text-xs">·</span>
                <button onClick={handleCopyCode} className="flex items-center gap-1 group">
                  {copied ? <Check className="w-3 h-3 text-[#64748B]" /> : <Copy className="w-3 h-3 text-[#94A3B8] group-hover:text-[#64748B] transition-colors" />}
                  <span className={`text-[11px] font-mono tracking-wider ${copied ? "text-[#64748B]" : "text-[#94A3B8] group-hover:text-[#64748B]"} transition-colors`}>
                    {profile.friend_code}
                  </span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      {user && userId && (
        <div className="px-4 mt-2 mb-2">
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
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 mb-4 mt-2">
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-[#E2E8F0]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab
                  ? "bg-[#14b8a6] text-white shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
              style={{ fontFamily: SPACE }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 space-y-3">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "Dashboard" && userId && profile && (
            <ProfileDashboardTab userId={userId} profile={{ name: profile.name, pdr_rating: profile.pdr_rating, pdr_phase: profile.pdr_phase, created_at: profile.created_at }} />
          )}
          {activeTab === "Matches" && userId && (
            <ProfileMatchesTab userId={userId} />
          )}
          {activeTab === "Analysis" && userId && (
            <ProfileAnalysisTab userId={userId} />
          )}
          {activeTab === "Credits" && userId && (
            <ProfileCreditsTab userId={userId} />
          )}
        </motion.div>

        {/* Personal Details - read-only collapsible */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3.5">
              <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">Personal Details</span>
              {detailsOpen ? <ChevronUp className="w-4 h-4 text-[#CBD5E1]" /> : <ChevronDown className="w-4 h-4 text-[#CBD5E1]" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {detailFields.map(f => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.label}
                        className={`rounded-xl border border-[#E2E8F0] p-3 ${f.full ? "col-span-2" : ""}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Icon className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wider">{f.label}</span>
                        </div>
                        <p className={`text-sm font-medium truncate ${f.value ? "text-[#0F172A]" : "text-[#CBD5E1]"}`}>
                          {f.value || "Not set"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Clubs */}
        {userId && <ProfileClubsGlass userId={userId} />}
      </div>
    </div>
  );
}
