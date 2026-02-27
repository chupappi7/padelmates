import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CreditCard,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HeroCard } from "@/components/profile/HeroCard";
import { PDRSection } from "@/components/profile/PDRSection";
import { PerformanceStats } from "@/components/profile/PerformanceStats";

import { LevelSelectSheet } from "@/components/profile/LevelSelectSheet";
import { ProfileClubs } from "@/components/profile/ProfileClubs";

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  skill_level: number;
  bio: string | null;
  games_played: number;
  bank_details: string | null;
  friend_code: string | null;
  pdr_rating: number | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [bankDetailsForm, setBankDetailsForm] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);
  const [matchStats, setMatchStats] = useState({ played: 0, wins: 0 });

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    skill_level: 2 as number,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMatchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data as Profile);
      setFormData({
        name: data.name,
        bio: data.bio || "",
        skill_level: data.skill_level,
      });
      setBankDetailsForm((data as any).bank_details || "");
    }
    setLoading(false);
  };

  const fetchMatchStats = async () => {
    if (!user) return;
    const { data: myMatchPlayers } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", user.id);

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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: formData.name,
        bio: formData.bio,
        skill_level: formData.skill_level,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  const handleSavePayment = async () => {
    if (!user) return;
    setSavingPayment(true);
    const { error } = await supabase
      .from("profiles")
      .update({ bank_details: bankDetailsForm } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to save payment info");
    } else {
      toast.success("Payment info saved!");
      setEditingPayment(false);
      fetchProfile();
    }
    setSavingPayment(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload avatar");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    toast.success("Avatar updated!");
    fetchProfile();
  };

  const handleSaveLevel = async (level: number) => {
    if (!user) return;
    setSavingLevel(true);
    const { error } = await supabase
      .from("profiles")
      .update({ skill_level: level })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update level");
    } else {
      toast.success("Level updated!");
      setLevelSheetOpen(false);
      fetchProfile();
    }
    setSavingLevel(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-24 bg-muted rounded-xl" />
          </div>
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
          {/* 1️⃣ Hero Card / Edit Form */}
          {!editing ? (
            <HeroCard
              name={profile?.name || ""}
              avatarUrl={profile?.avatar_url || null}
              skillLevel={profile?.skill_level || 2}
              friendCode={profile?.friend_code || null}
              pdrRating={profile?.pdr_rating ?? null}
              isSelf
              onEditClick={() => setEditing(true)}
              onAvatarUpload={handleAvatarUpload}
              onLevelBadgeClick={() => setLevelSheetOpen(true)}
            />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2
                className="font-semibold text-sm"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Edit Profile
              </h2>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Skill Level</Label>
                <Select
                  value={String(formData.skill_level)}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      skill_level: parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">A</SelectItem>
                    <SelectItem value="3">B</SelectItem>
                    <SelectItem value="2">C</SelectItem>
                    <SelectItem value="1">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell others about yourself..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}

          {/* 5️⃣ Performance Stats */}
          <PerformanceStats
            matches={matchStats.played || profile?.games_played || 0}
            wins={matchStats.wins}
            losses={losses}
            winRate={winRate}
          />

          {/* 6️⃣ Clubs */}
          {user && <ProfileClubs userId={user.id} />}

          {/* 7️⃣ Payment Info (Collapsible) */}
          <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment Info</span>
                  {profile?.bank_details && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      Set
                    </span>
                  )}
                </div>
                {paymentOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                  {editingPayment ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Add your account number, Revolut tag, or any payment
                        link. This is shared with buyers during court listing
                        chats.
                      </p>
                      <textarea
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                        placeholder={
                          "Revolut: @yourname\nBank: 1234 5678 9012\nPayPal: you@email.com"
                        }
                        value={bankDetailsForm}
                        onChange={(e) => setBankDetailsForm(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setBankDetailsForm(profile?.bank_details || "");
                            setEditingPayment(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="hero"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={handleSavePayment}
                          disabled={savingPayment}
                        >
                          {savingPayment ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </>
                  ) : profile?.bank_details ? (
                    <div className="space-y-2">
                      <div className="bg-muted/50 rounded-lg px-3 py-2.5">
                        <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                          {profile.bank_details}
                        </pre>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-muted-foreground"
                        onClick={() => setEditingPayment(true)}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        No payment info added yet.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditingPayment(true)}
                      >
                        Add Payment Info
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </motion.div>
      </div>

      {/* Level Select Sheet */}
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
