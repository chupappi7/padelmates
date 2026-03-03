import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Settings, Camera, ChevronDown, ChevronUp, CreditCard, Pencil, ImagePlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SkillBadge } from "@/components/games/SkillBadge";
import { LevelSelectSheet } from "@/components/profile/LevelSelectSheet";
import { ProfileDashboardTab } from "@/components/profile/tabs/ProfileDashboardTab";
import { ProfileMatchesTab } from "@/components/profile/tabs/ProfileMatchesTab";
import { ProfileAnalysisTab } from "@/components/profile/tabs/ProfileAnalysisTab";
import { ProfileAchievementsTab } from "@/components/profile/tabs/ProfileAchievementsTab";
import { ProfilePersonalDetails } from "@/components/profile/tabs/ProfilePersonalDetails";
import { ProfileClubsGlass } from "@/components/profile/tabs/ProfileClubsGlass";
import { ProfilePaymentInfo } from "@/components/profile/tabs/ProfilePaymentInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Check } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

const TABS = ["Dashboard", "Matches", "Analysis", "Achievements"] as const;
type Tab = typeof TABS[number];

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number;
  bank_details: string | null;
  bank_qr_url: string | null;
  friend_code: string | null;
  pdr_rating: number | null;
  pdr_phase: string;
  region: string | null;
  sex: string | null;
  birth_year: number | null;
  preferred_position: string | null;
  preferred_hand: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();
    if (data) setProfile(data as unknown as Profile);
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
    if (uploadError) { toast.error("Failed to upload avatar"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast.success("Avatar updated!");
    fetchProfile();
  };

  const handleSaveLevel = async (level: number) => {
    if (!user) return;
    setSavingLevel(true);
    const { error } = await supabase.from("profiles").update({ skill_level: level }).eq("user_id", user.id);
    if (error) toast.error("Failed to update level");
    else { toast.success("Level updated!"); setLevelSheetOpen(false); fetchProfile(); }
    setSavingLevel(false);
  };

  const handleCopyCode = () => {
    if (!profile?.friend_code) return;
    navigator.clipboard.writeText(profile.friend_code);
    setCopied(true);
    toast.success("Friend code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) { navigate("/login"); return null; }

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

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-teal-50 to-white px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-[#64748B]" />
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
          <div className="relative">
            <Avatar className="w-20 h-20 ring-2 ring-[#14b8a6]/20 ring-offset-2 ring-offset-white">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-[#14b8a6]/10 text-[#14b8a6]" style={{ fontFamily: SPACE }}>
                {profile?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload-main"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center cursor-pointer shadow-lg shadow-[#14b8a6]/30"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </label>
            <Input type="file" id="avatar-upload-main" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <p className="text-[#0F172A] text-xl font-bold mt-3" style={{ fontFamily: SPACE }}>{profile?.name}</p>

          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={() => setLevelSheetOpen(true)}>
              <SkillBadge level={profile?.skill_level || 2} size="sm" />
            </button>
            {profile?.friend_code && (
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

      {/* Tab Navigation */}
      <div className="px-4 mb-4 mt-4">
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
          {activeTab === "Dashboard" && user && profile && (
            <ProfileDashboardTab userId={user.id} profile={profile} />
          )}
          {activeTab === "Matches" && user && (
            <ProfileMatchesTab userId={user.id} />
          )}
          {activeTab === "Analysis" && user && (
            <ProfileAnalysisTab userId={user.id} />
          )}
          {activeTab === "Achievements" && user && (
            <ProfileAchievementsTab userId={user.id} />
          )}
        </motion.div>

        {/* Personal Details - collapsible */}
        {user && profile && (
          <ProfilePersonalDetails
            userId={user.id}
            region={profile.region}
            preferredPosition={profile.preferred_position}
            preferredHand={profile.preferred_hand}
            sex={profile.sex}
            birthYear={profile.birth_year}
            onSaved={fetchProfile}
          />
        )}

        {/* Clubs */}
        {user && <ProfileClubsGlass userId={user.id} />}

        {/* Payment Info */}
        {user && profile && (
          <ProfilePaymentInfo
            userId={user.id}
            bankDetails={profile.bank_details}
            bankQrUrl={profile.bank_qr_url}
            onSaved={fetchProfile}
          />
        )}
      </div>

      <LevelSelectSheet
        open={levelSheetOpen}
        onOpenChange={setLevelSheetOpen}
        currentLevel={profile?.skill_level || 2}
        onSave={handleSaveLevel}
        saving={savingLevel}
      />
    </div>
  );
}
