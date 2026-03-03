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
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HeroCard } from "@/components/profile/HeroCard";
import { LevelSelectSheet } from "@/components/profile/LevelSelectSheet";
import { ProfileClubs } from "@/components/profile/ProfileClubs";
import { ProfilePerformanceCard } from "@/components/profile/ProfilePerformanceCard";
import { PersonalDetailsGrid } from "@/components/profile/PersonalDetailsGrid";

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
  preferred_hand: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [bankDetailsForm, setBankDetailsForm] = useState("");
  const [bankQrUrl, setBankQrUrl] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setProfile(data as unknown as Profile);
      setBankDetailsForm((data as any).bank_details || "");
      setBankQrUrl((data as any).bank_qr_url || null);
    }
    setLoading(false);
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
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
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
            <div className="h-32 bg-muted rounded-2xl" />
            <div className="h-16 bg-muted rounded-2xl" />
            <div className="h-24 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <HeroCard
            name={profile?.name || ""}
            avatarUrl={profile?.avatar_url || null}
            skillLevel={profile?.skill_level || 2}
            friendCode={profile?.friend_code || null}
            pdrRating={profile?.pdr_rating ?? null}
            isSelf
            onEditClick={() => {}}
            onAvatarUpload={handleAvatarUpload}
            onLevelBadgeClick={() => setLevelSheetOpen(true)}
            onPdrClick={() => navigate("/elo")}
          />

          {user && <ProfilePerformanceCard userId={user.id} />}

          {user && (
            <PersonalDetailsGrid
              userId={user.id}
              region={profile?.region || null}
              preferredPosition={profile?.preferred_position || null}
              preferredHand={profile?.preferred_hand || null}
              sex={profile?.sex || null}
              birthYear={profile?.birth_year || null}
              onSaved={fetchProfile}
            />
          )}

          {user && <ProfileClubs userId={user.id} />}

          <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">
                      Payment Info
                    </span>
                    {profile?.bank_details && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        Set
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 pl-6">
                    Send to players & receive payment for court bookings
                  </span>
                </div>
                {paymentOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
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
