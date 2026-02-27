import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, ChevronRight } from "lucide-react";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
}

interface ProfileClubsProps {
  userId: string;
}

export function ProfileClubs({ userId }: ProfileClubsProps) {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubs();
  }, [userId]);

  const fetchClubs = async () => {
    const { data } = await supabase
      .from("club_followers")
      .select("club_id, role")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!data || data.length === 0) {
      setLoading(false);
      return;
    }

    const clubIds = data.map((f) => f.club_id);
    const roleMap = new Map(data.map((f) => [f.club_id, f.role]));

    const { data: clubsData } = await supabase
      .from("clubs")
      .select("id, name, logo_url")
      .in("id", clubIds);

    if (clubsData) {
      setClubs(
        clubsData.map((c) => ({
          ...c,
          role: roleMap.get(c.id) || "member",
        }))
      );
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-5 w-20 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (clubs.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Clubs</span>
        <span className="text-[11px] text-muted-foreground ml-auto">{clubs.length}</span>
      </div>

      <div className="px-2 pb-2">
        {clubs.map((club) => (
          <button
            key={club.id}
            onClick={() => navigate(`/clubs/${club.id}`)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Avatar className="h-8 w-8 rounded-lg border border-border">
              <AvatarImage src={club.logo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs rounded-lg">
                {club.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{club.name}</p>
            </div>
            {(club.role === "owner" || club.role === "admin") && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {club.role}
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
