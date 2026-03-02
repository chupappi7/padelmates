import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, ChevronUp, MoreVertical, Shield, ShieldOff, UserX } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const { user } = useAuth();

  const currentUserId = user?.id;
  const isOwner = currentUserId === ownerId;
  const isAdmin = members.some(m => m.user_id === currentUserId && (m.role === "admin" || m.role === "owner"));
  const canManage = isOwner || isAdmin;

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

  const updateRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("club_followers").update({ role }).eq("club_id", clubId).eq("user_id", userId);
    if (error) toast.error("Failed to update role");
    else { toast.success("Role updated"); fetchMembers(); }
  };

  const removeMember = async (userId: string) => {
    const { error } = await supabase.from("club_followers").delete().eq("club_id", clubId).eq("user_id", userId);
    if (error) toast.error("Failed to remove member");
    else { toast.success("Member removed"); fetchMembers(); }
  };

  const admins = members.filter(m => m.role === "owner" || m.role === "admin");
  const regularMembers = members.filter(m => m.role === "member");

  const filtered = regularMembers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const MemberRow = ({ member }: { member: Member }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
      <div
        onClick={() => navigate(`/user/${member.user_id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
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

      {/* Role management menu */}
      {canManage && member.user_id !== ownerId && member.user_id !== currentUserId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwner && member.role === "member" && (
              <DropdownMenuItem onClick={() => updateRole(member.user_id, "admin")}>
                <Shield className="w-4 h-4 mr-2" /> Make Admin
              </DropdownMenuItem>
            )}
            {isOwner && member.role === "admin" && (
              <DropdownMenuItem onClick={() => updateRole(member.user_id, "member")}>
                <ShieldOff className="w-4 h-4 mr-2" /> Remove Admin
              </DropdownMenuItem>
            )}
            {(isOwner || member.role === "member") && (
              <DropdownMenuItem onClick={() => removeMember(member.user_id)} className="text-destructive">
                <UserX className="w-4 h-4 mr-2" /> Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
