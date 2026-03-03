import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
}

export function ProfileClubsGlass({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, [userId]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("club_followers").select("club_id, role").eq("user_id", userId).eq("status", "active");
    if (!data || data.length === 0) { setLoading(false); return; }
    const clubIds = data.map(f => f.club_id);
    const roleMap = new Map(data.map(f => [f.club_id, f.role]));
    const { data: clubsData } = await supabase.from("clubs").select("id, name, logo_url").in("id", clubIds);
    if (clubsData) setClubs(clubsData.map(c => ({ ...c, role: roleMap.get(c.id) || "member" })));
    setLoading(false);
  };

  if (loading || clubs.length === 0) return null;

  return (
    <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-[#94A3B8]" />
        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.1em]">Clubs</span>
        <span className="text-[11px] text-[#CBD5E1] ml-auto">{clubs.length}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {clubs.map(club => (
          <button
            key={club.id}
            onClick={() => navigate(`/clubs/${club.id}`)}
            className="shrink-0 w-28 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-[#F1F5F9] transition-colors"
          >
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage src={club.logo_url || undefined} />
              <AvatarFallback className="bg-[#14b8a6]/10 text-[#14b8a6] font-bold text-xs rounded-lg">
                {club.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-[#0F172A] text-[11px] font-medium truncate w-full text-center">{club.name}</p>
            {(club.role === "owner" || club.role === "admin") && (
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#14b8a6] bg-[#14b8a6]/10 px-1.5 py-0.5 rounded-full">
                {club.role}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
