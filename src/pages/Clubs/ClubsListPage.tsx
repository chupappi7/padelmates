import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Plus, Search, Users, CalendarDays, Lock, Check, UserPlus, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  is_private: boolean;
  owner_id: string;
  member_count: number;
  upcoming_count: number;
  is_member: boolean;
}

type Filter = "all" | "joined";

export default function ClubsListPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchClubs();
  }, [user]);

  const fetchClubs = async () => {
    const { data: clubsData, error } = await supabase
      .from("clubs")
      .select("id, name, logo_url, cover_url, city, country, is_private, owner_id")
      .order("created_at", { ascending: false });

    if (error || !clubsData) { setLoading(false); return; }

    const clubIds = clubsData.map(c => c.id);
    const now = new Date().toISOString();

    const [membersRes, upcomingRes, myMemberships] = await Promise.all([
      supabase.from("club_followers").select("club_id").eq("status", "active").in("club_id", clubIds),
      supabase.from("games").select("club_id").in("club_id", clubIds).gte("date_time", now),
      user
        ? supabase.from("club_followers").select("club_id").eq("user_id", user.id).eq("status", "active").in("club_id", clubIds)
        : Promise.resolve({ data: [] }),
    ]);

    const memberCounts = new Map<string, number>();
    membersRes.data?.forEach(m => memberCounts.set(m.club_id, (memberCounts.get(m.club_id) || 0) + 1));

    const upcomingCounts = new Map<string, number>();
    upcomingRes.data?.forEach(g => upcomingCounts.set(g.club_id!, (upcomingCounts.get(g.club_id!) || 0) + 1));

    const mySet = new Set(myMemberships.data?.map(m => m.club_id) || []);

    setClubs(clubsData.map(c => ({
      ...c,
      member_count: memberCounts.get(c.id) || 0,
      upcoming_count: upcomingCounts.get(c.id) || 0,
      is_member: mySet.has(c.id),
    })));
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
        setClubs(prev => prev.map(c => c.id === clubId ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
        toast.success("Joined!");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setJoiningId(null); }
  };

  const filteredClubs = clubs
    .filter(c => filter === "all" || c.is_member)
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 pb-28 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">Clubs</h1>
          <p className="text-sm text-muted-foreground mb-5">Join a club or create your own community</p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-5">
            {(["all", "joined"] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {f === "all" ? "All" : "Joined"}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredClubs.length > 0 ? (
          <div className="space-y-4">
            {filteredClubs.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => navigate(`/clubs/${club.id}`)}
                className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all"
              >
                {/* Cover */}
                <div
                  className="h-24 w-full"
                  style={{
                    background: club.cover_url
                      ? `url(${club.cover_url}) center/cover`
                      : "linear-gradient(135deg, #0D2137, #1A4060)",
                  }}
                />

                {/* Body */}
                <div className="p-4 -mt-6 relative">
                  <div className="flex items-end justify-between mb-2">
                    <Avatar className="h-12 w-12 rounded-xl border-2 border-card shadow-sm">
                      <AvatarImage src={club.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg rounded-xl">
                        {club.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {club.is_member ? (
                      <span className="text-xs font-semibold text-primary border border-primary rounded-full px-3 py-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Joined
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full h-8 px-4 text-xs"
                        onClick={e => handleJoin(e, club.id, club.is_private)}
                        disabled={joiningId === club.id}
                      >
                        <UserPlus className="w-3 h-3 mr-1" /> Join
                      </Button>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-base flex items-center gap-1.5">
                    {club.name}
                    {club.is_private && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </h3>

                  {(club.city || club.country) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3" /> {[club.city, club.country].filter(Boolean).join(", ")}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2.5">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {club.member_count} members</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> {club.upcoming_count} upcoming</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">No clubs found</h3>
            <p className="text-sm text-muted-foreground mb-5">
              {searchQuery ? "Try a different search term" : "Be the first to create a club!"}
            </p>
          </motion.div>
        )}

        {/* Floating Create button */}
        {user && (
          <Button
            variant="hero"
            size="lg"
            className="fixed bottom-20 right-4 rounded-full shadow-lg z-30"
            onClick={() => navigate("/clubs/create")}
          >
            <Plus className="w-5 h-5" /> Create Club
          </Button>
        )}
      </div>
    </div>
  );
}
