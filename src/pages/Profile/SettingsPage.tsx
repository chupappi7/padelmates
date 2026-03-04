import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { ProfilePersonalDetails } from "@/components/profile/tabs/ProfilePersonalDetails";
import { ProfilePaymentInfo } from "@/components/profile/tabs/ProfilePaymentInfo";

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
        </div>
      )}
    </div>
  );
}
