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
  ImagePlus,
  X,
  History,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HeroCard } from "@/components/profile/HeroCard";
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
  bank_qr_url: string | null;
  friend_code: string | null;
  pdr_rating: number | null;
  region: string | null;
  sex: string | null;
  birth_year: number | null;
  preferred_position: string | null;
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
  const [bankQrUrl, setBankQrUrl] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    skill_level: 2 as number,
    preferred_position: "left" as string,
    sex: "" as string,
    birth_year: null as number | null,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data as unknown as Profile);
      setFormData({
        name: data.name,
        bio: data.bio || "",
        skill_level: data.skill_level,
        preferred_position: (data as any).preferred_position || "",
        sex: (data as any).sex || "",
        birth_year: (data as any).birth_year || null,
      });
      setBankDetailsForm((data as any).bank_details || "");
      setBankQrUrl((data as any).bank_qr_url || null);
    }
    setLoading(false);
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
        preferred_position: formData.preferred_position || null,
        sex: formData.sex || null,
        birth_year: formData.birth_year || null,
      } as any)
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
      .update({ bank_details: bankDetailsForm, bank_qr_url: bankQrUrl } as any)
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

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingQr(true);
    const fileName = `${user.id}/qr-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file);
    if (uploadError) {
      toast.error("Failed to upload QR code");
      setUploadingQr(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    setBankQrUrl(publicUrl);
    setUploadingQr(false);
    toast.success("QR code uploaded! Don't forget to save.");
  };

  const handleRemoveQr = () => {
    setBankQrUrl(null);
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

  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;

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
              onPdrClick={() => navigate("/elo")}
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
                <Label>Preferred Position</Label>
                <Select
                  value={formData.preferred_position}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, preferred_position: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left side</SelectItem>
                    <SelectItem value="right">Right side</SelectItem>
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
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, sex: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  type="number"
                  min={10}
                  max={99}
                  placeholder="e.g. 25"
                  value={formData.birth_year ? new Date().getFullYear() - formData.birth_year : ""}
                  onChange={(e) => {
                    const age = parseInt(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      birth_year: age ? new Date().getFullYear() - age : null,
                    }));
                  }}
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

          {/* Personal Details */}
          {!editing && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Details</h3>
              {profile?.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-foreground">{profile.region}</span>
                </div>
              )}
              {profile?.preferred_position && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position</span>
                  <span className="text-foreground capitalize">{profile.preferred_position} side</span>
                </div>
              )}
              {profile?.sex && (
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
          )}

          {/* Match History Button */}
          {!editing && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate("/match-history")}
            >
              <History className="w-4 h-4" />
              Match History
            </Button>
          )}

          {/* Clubs */}
          {user && <ProfileClubs userId={user.id} />}

          {/* Payment Info (Collapsible) */}
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
                        Add your account number, Revolut tag, or upload a QR
                        code. This is shared with buyers during court listing
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

                      {/* QR Code Upload */}
                      <div className="space-y-2">
                        <Label className="text-xs">Payment QR Code</Label>
                        {bankQrUrl ? (
                          <div className="relative inline-block">
                            <img
                              src={bankQrUrl}
                              alt="Payment QR"
                              className="w-32 h-32 object-contain rounded-lg border border-border bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveQr}
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg px-3 py-3 w-fit">
                            <ImagePlus className="w-4 h-4" />
                            {uploadingQr ? "Uploading..." : "Upload QR code"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleQrUpload}
                              disabled={uploadingQr}
                            />
                          </label>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => {
                            setBankDetailsForm(profile?.bank_details || "");
                            setBankQrUrl(profile?.bank_qr_url || null);
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
                  ) : profile?.bank_details || profile?.bank_qr_url ? (
                    <div className="space-y-2">
                      {profile?.bank_details && (
                        <div className="bg-muted/50 rounded-lg px-3 py-2.5">
                          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                            {profile.bank_details}
                          </pre>
                        </div>
                      )}
                      {profile?.bank_qr_url && (
                        <img
                          src={profile.bank_qr_url}
                          alt="Payment QR"
                          className="w-32 h-32 object-contain rounded-lg border border-border bg-white"
                        />
                      )}
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
