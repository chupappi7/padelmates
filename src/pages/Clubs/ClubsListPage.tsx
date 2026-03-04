import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Plus, Search, Users, CalendarDays, Lock, Check, MapPin, Settings, LogOut, Compass } from "lucide-react";
import { toast } from "sonner";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  is_private: boolean;
  owner_id: string;
  member_count: number;
  upcoming_count: number;
  is_member: boolean;
  my_role: "owner" | "admin" | "member" | null;
}

type Tab = "my" | "discover";

export default function ClubsListPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<Tab>("my");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchClubs();
  }, [user]);

  const fetchClubs = async () => {
    const { data: clubsData, error } = await supabase
      .from("clubs")
      .select("id, name, logo_url, city, country, is_private, owner_id")
      .order("created_at", { ascending: false });

    if (error || !clubsData) { setLoading(false); return; }

    const clubIds = clubsData.map(c => c.id);
    const now = new Date().toISOString();

    const [membersRes, upcomingRes, myMemberships] = await Promise.all([
      supabase.from("club_followers").select("club_id").eq("status", "active").in("club_id", clubIds),
      supabase.from("games").select("club_id").in("club_id", clubIds).gte("date_time", now),
      user
        ? supabase.from("club_followers").select("club_id, role").eq("user_id", user.id).eq("status", "active").in("club_id", clubIds)
        : Promise.resolve({ data: [] }),
    ]);

    const memberCounts = new Map<string, number>();
    membersRes.data?.forEach(m => memberCounts.set(m.club_id, (memberCounts.get(m.club_id) || 0) + 1));

    const upcomingCounts = new Map<string, number>();
    upcomingRes.data?.forEach(g => upcomingCounts.set(g.club_id!, (upcomingCounts.get(g.club_id!) || 0) + 1));

    const myRoles = new Map<string, string>();
    (myMemberships.data || []).forEach((m: any) => myRoles.set(m.club_id, m.role));

    setClubs(clubsData.map(c => {
      const followerRole = myRoles.get(c.id);
      let my_role: Club["my_role"] = null;
      if (user && c.owner_id === user.id) my_role = "owner";
      else if (followerRole === "admin") my_role = "admin";
      else if (followerRole) my_role = "member";

      return {
        ...c,
        member_count: memberCounts.get(c.id) || 0,
        upcoming_count: upcomingCounts.get(c.id) || 0,
        is_member: !!followerRole || (user ? c.owner_id === user.id : false),
        my_role,
      };
    }));
    setLoading(false);
  };

  const handleJoin = async (e: React.MouseEvent, clubId: string, isPrivate: boolean) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    setJoiningId(clubId);
    try {
      await supabase.from("club_followers").insert({
        club_id: clubId,
        user_id: user.id,
        role: "member",
        status: isPrivate ? "pending" : "active",
      });
      if (isPrivate) {
        toast.success("Join request sent!");
      } else {
        setClubs(prev => prev.map(c => c.id === clubId ? { ...c, is_member: true, my_role: "member", member_count: c.member_count + 1 } : c));
        toast.success("Joined!");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setJoiningId(null); }
  };

  const handleLeave = async (e: React.MouseEvent, clubId: string) => {
    e.stopPropagation();
    if (!user) return;
    setLeavingId(clubId);
    await supabase.from("club_followers").delete().eq("club_id", clubId).eq("user_id", user.id);
    setClubs(prev => prev.map(c => c.id === clubId ? { ...c, is_member: false, my_role: null, member_count: Math.max(0, c.member_count - 1) } : c));
    toast.success("Left club");
    setLeavingId(null);
  };

  // ── My Clubs: sorted by role priority ──
  const myClubs = clubs
    .filter(c => c.is_member)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const order = { owner: 0, admin: 1, member: 2 };
      return (order[a.my_role || "member"] ?? 2) - (order[b.my_role || "member"] ?? 2);
    });

  // ── Discover: public clubs user hasn't joined ──
  const discoverClubs = clubs
    .filter(c => !c.is_member)
    .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeList = tab === "my" ? myClubs : discoverClubs;

  const roleBadge = (role: Club["my_role"]) => {
    if (role === "owner") return <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full shrink-0">Owner</span>;
    if (role === "admin") return <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">Admin</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 pb-28 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-display text-2xl font-bold mb-0.5">Clubs</h1>
              <p className="text-sm text-muted-foreground">Your communities & discover new ones</p>
            </div>
            {user && (
              <button
                onClick={() => navigate("/clubs/create")}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {([
              { id: "my" as Tab, label: "My Clubs", icon: <Users className="w-3.5 h-3.5" /> },
              { id: "discover" as Tab, label: "Discover", icon: <Compass className="w-3.5 h-3.5" /> },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSearchQuery(""); }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {t.icon} {t.label}
                {t.id === "my" && myClubs.length > 0 && (
                  <span className={`text-[10px] ml-0.5 ${tab === t.id ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                    ({clubs.filter(c => c.is_member).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search (always on discover, optional on my clubs) */}
          {tab === "discover" && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clubs to join..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : activeList.length > 0 ? (
          <div className="space-y-3">
            {activeList.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="bg-card rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all shadow-sm border border-border"
              >
                <div className="flex items-center gap-3.5">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 rounded-full shrink-0">
                    <AvatarImage src={club.logo_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg rounded-full">
                      {club.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm truncate">
                        {club.name}
                      </h3>
                      {club.is_private && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                      {tab === "my" && roleBadge(club.my_role)}
                    </div>
                    {(club.city || club.country) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" /> {[club.city, club.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {club.member_count} {club.member_count === 1 ? "member" : "members"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {club.upcoming_count} upcoming</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {tab === "my" ? (
                      <>
                        {(club.my_role === "owner" || club.my_role === "admin") && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/clubs/${club.id}`); }}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1.5"
                            title="Manage"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        {club.my_role === "member" && (
                          <button
                            onClick={e => handleLeave(e, club.id)}
                            disabled={leavingId === club.id}
                            className="text-muted-foreground/50 hover:text-destructive transition-colors p-1.5"
                            title="Leave club"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-[11px] font-semibold text-primary border border-primary rounded-full px-3 py-1 flex items-center gap-1 whitespace-nowrap">
                          <Check className="w-3 h-3" /> Joined
                        </span>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full h-8 px-4 text-xs"
                        onClick={e => handleJoin(e, club.id, club.is_private)}
                        disabled={joiningId === club.id}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              {tab === "my" ? <Users className="w-7 h-7 text-muted-foreground" /> : <Compass className="w-7 h-7 text-muted-foreground" />}
            </div>
            <h3 className="font-display text-lg font-bold mb-1">
              {tab === "my" ? "No clubs yet" : "No clubs found"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {tab === "my"
                ? "Join a club from the Discover tab or create your own!"
                : searchQuery ? "Try a different search" : "All clubs have been joined! 🎉"}
            </p>
            {tab === "my" && (
              <Button variant="outline" onClick={() => setTab("discover")}>
                <Compass className="w-4 h-4 mr-1" /> Discover Clubs
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
