import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface Member {
  user_id: string;
  role: string;
  created_at: string;
  name: string;
  avatar_url: string | null;
  pdr_rating: number | null;
}

export default function ClubMembersTab({ clubId, ownerId }: { clubId: string; ownerId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adminsOpen, setAdminsOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembers();
  }, [clubId]);

  const fetchMembers = async () => {
    const { data: followers } = await supabase
      .from("club_followers")
      .select("user_id, role, created_at")
      .eq("club_id", clubId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!followers || followers.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const userIds = followers.map(f => f.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, pdr_rating")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setMembers(followers.map(f => {
      const p = profileMap.get(f.user_id);
      return {
        ...f,
        name: p?.name || "Unknown",
        avatar_url: p?.avatar_url || null,
        pdr_rating: p?.pdr_rating ?? null,
      };
    }));
    setLoading(false);
  };

  const admins = members.filter(m => m.role === "owner" || m.role === "admin");
  const regularMembers = members.filter(m => m.role === "member");

  const filtered = regularMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const MemberRow = ({ member }: { member: Member }) => (
    <div
      onClick={() => navigate(`/user/${member.user_id}`)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <Avatar className="h-10 w-10 rounded-xl">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">
          {member.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{member.name}</span>
          {member.user_id === ownerId && (
            <Badge className="text-[10px] bg-[hsl(220,25%,10%)] text-white border-0 rounded px-1.5 py-0">Owner</Badge>
          )}
          {member.role === "admin" && member.user_id !== ownerId && (
            <Badge className="text-[10px] bg-primary text-primary-foreground border-0 rounded px-1.5 py-0">Admin</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {member.pdr_rating != null ? `PDR ${member.pdr_rating.toFixed(1)}` : "NR"} · Joined {format(new Date(member.created_at), "MMM d")}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-card rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <button
            onClick={() => setAdminsOpen(!adminsOpen)}
            className="flex items-center gap-1.5 font-display font-bold text-sm text-muted-foreground mb-1"
          >
            Admins ({admins.length})
            {adminsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {adminsOpen && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {admins.map(m => <MemberRow key={m.user_id} member={m} />)}
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div>
        <h3 className="font-display font-bold text-sm text-muted-foreground mb-1">
          Members ({filtered.length})
        </h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {filtered.length > 0 ? (
            filtered.map(m => <MemberRow key={m.user_id} member={m} />)
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">No members found</div>
          )}
        </div>
      </div>
    </div>
  );
}
