import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Bug, Send, GraduationCap } from "lucide-react";
import { ProfilePersonalDetails } from "@/components/profile/tabs/ProfilePersonalDetails";
import { ProfilePaymentInfo } from "@/components/profile/tabs/ProfilePaymentInfo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface Profile {
  region: string | null;
  sex: string | null;
  birth_year: number | null;
  preferred_position: string | null;
  preferred_hand: string | null;
  bank_details: string | null;
  bank_qr_url: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bugSubject, setBugSubject] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("region, sex, birth_year, preferred_position, preferred_hand, bank_details, bank_qr_url")
      .eq("user_id", user?.id)
      .single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  };

  const handleReportBug = () => {
    if (!bugDescription.trim()) {
      toast.error("Please describe the bug");
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(bugSubject || "Bug Report");
    const body = encodeURIComponent(
      `${bugDescription}\n\n---\nReported by: ${user?.email ?? "Unknown"}\nUser ID: ${user?.id ?? "Unknown"}\nTimestamp: ${new Date().toISOString()}`
    );
    window.open(`mailto:thinht7110@gmail.com?subject=${subject}&body=${body}`, "_blank");
    toast.success("Opening email client…");
    setBugSubject("");
    setBugDescription("");
    setSending(false);
  };

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-32 md:pb-8 lg:max-w-2xl lg:mx-auto">
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-[#64748B]" />
        </button>
        <h1 className="text-[#0F172A] font-bold text-lg" style={{ fontFamily: SPACE }}>Settings</h1>
      </div>

      {loading ? (
        <div className="px-4 space-y-3 mt-4">
          <div className="h-40 bg-[#E2E8F0] rounded-2xl animate-pulse" />
          <div className="h-40 bg-[#E2E8F0] rounded-2xl animate-pulse" />
        </div>
      ) : profile && (
        <div className="px-4 space-y-3 mt-4">
          <ProfilePersonalDetails
            userId={user.id}
            region={profile.region}
            preferredPosition={profile.preferred_position}
            preferredHand={profile.preferred_hand}
            sex={profile.sex}
            birthYear={profile.birth_year}
            onSaved={fetchProfile}
          />
          <ProfilePaymentInfo
            userId={user.id}
            bankDetails={profile.bank_details}
            bankQrUrl={profile.bank_qr_url}
            onSaved={fetchProfile}
          />

          {/* Show Tutorial Again */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <button
              onClick={async () => {
                await supabase
                  .from("profiles")
                  .update({ tutorial_completed: false } as any)
                  .eq("user_id", user.id);
                toast.success("Tutorial reset!");
                navigate("/");
              }}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: SPACE }}>Show tutorial again</p>
                <p className="text-xs text-[#64748B]">Replay the onboarding walkthrough</p>
              </div>
            </button>
          </div>

          {/* Report Bug */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <Bug className="w-4 h-4 text-destructive" />
              </div>
              <h2 className="font-bold text-sm text-[#0F172A]" style={{ fontFamily: SPACE }}>Report a Bug</h2>
            </div>
            <Input
              placeholder="Subject (optional)"
              value={bugSubject}
              onChange={(e) => setBugSubject(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Describe what went wrong…"
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              className="text-sm min-h-[100px]"
            />
            <Button
              onClick={handleReportBug}
              disabled={sending || !bugDescription.trim()}
              className="w-full gap-2"
              variant="destructive"
            >
              <Send className="w-4 h-4" />
              Send Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
