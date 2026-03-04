import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Users, Calendar, CalendarDays, MoreVertical, Pencil,
  UserPlus, Check, Lock, MapPin, LogOut, Flag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ClubFeedTab from "@/components/clubs/ClubFeedTab";
import ClubMatchesTab from "@/components/clubs/ClubMatchesTab";
import ClubMembersTab from "@/components/clubs/ClubMembersTab";
import ClubAboutTab from "@/components/clubs/ClubAboutTab";
import ClubAdminPanel from "@/components/clubs/ClubAdminPanel";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  owner_id: string;
  created_at: string;
  city: string | null;
  country: string | null;
  num_courts: number | null;
  is_private: boolean;
  instagram_url: string | null;
  website_url: string | null;
}

type TabId = "feed" | "matches" | "members" | "about";

const TABS: { id: TabId; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "matches", label: "Matches" },
  { id: "members", label: "Members" },
  { id: "about", label: "About" },
];

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersCount, setMembersCount] = useState(0);
  const [gamesCount, setGamesCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [memberStatus, setMemberStatus] = useState<"none" | "pending" | "active">("none");
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [actionLoading, setActionLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (id) fetchClub();
  }, [id]);

  const fetchClub = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("id", id!)
      .single();

    if (error || !data) {
      toast.error("Club not found");
      navigate("/clubs");
      return;
    }

    setClub(data as Club);

    const now = new Date().toISOString();
    const [membersRes, gamesRes, upcomingRes, membershipRes] = await Promise.all([
      supabase.from("club_followers").select("id", { count: "exact", head: true }).eq("club_id", id!).eq("status", "active"),
      supabase.from("games").select("id", { count: "exact", head: true }).eq("club_id", id!),
      supabase.from("games").select("id", { count: "exact", head: true }).eq("club_id", id!).gte("date_time", now),
      user
        ? supabase.from("club_followers").select("id, role, status").eq("club_id", id!).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setMembersCount(membersRes.count || 0);
    setGamesCount(gamesRes.count || 0);
    setUpcomingCount(upcomingRes.count || 0);

    if (membershipRes.data) {
      setMemberStatus(membershipRes.data.status as "active" | "pending");
      setMemberRole(membershipRes.data.role);
    } else {
      setMemberStatus("none");
      setMemberRole(null);
    }

    // Fetch owner profile
    const { data: ownerData } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("user_id", data.owner_id)
      .single();
    if (ownerData) setOwnerProfile(ownerData);

    setLoading(false);
  };

  const isOwner = user?.id === club?.owner_id;
  const isAdmin = isOwner || memberRole === "admin";

  const handleJoin = async () => {
    if (!user) { navigate("/login"); return; }
    setActionLoading(true);
    try {
      const status = club?.is_private ? "pending" : "active";
      await supabase.from("club_followers").insert({
        club_id: id!,
        user_id: user.id,
        role: "member",
        status,
      });
      setMemberStatus(status);
      if (status === "active") {
        setMembersCount(c => c + 1);
        setMemberRole("member");
        toast.success("Joined club!");
      } else {
        toast.success("Join request sent!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await supabase.from("club_followers").delete().eq("club_id", id!).eq("user_id", user.id);
      setMemberStatus("none");
      setMemberRole(null);
      setMembersCount(c => Math.max(0, c - 1));
      toast.success("Left club");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-44 bg-muted animate-pulse" />
        <div className="container max-w-2xl -mt-12 relative z-10">
          <div className="h-20 w-20 bg-card rounded-xl animate-pulse border-4 border-background" />
          <div className="h-6 w-48 bg-muted rounded animate-pulse mt-3" />
        </div>
      </div>
    );
  }

  if (!club) return null;

  const location = [club.city, club.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Cover */}
      <div
        className="h-44 w-full relative"
        style={{
          background: club.cover_url
            ? `url(${club.cover_url}) center/cover no-repeat`
            : "linear-gradient(135deg, #0D2137, #1A4060)",
        }}
      >
        {/* Top-right actions */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/30 text-white hover:bg-black/50 rounded-full h-9 w-9"
              onClick={() => setAdminOpen(true)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-black/30 text-white hover:bg-black/50 rounded-full h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {memberStatus === "active" && !isOwner && (
                <DropdownMenuItem onClick={handleLeave} disabled={actionLoading}>
                  <LogOut className="w-4 h-4 mr-2" /> Leave Club
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <Flag className="w-4 h-4 mr-2" /> Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Join / Status button */}
          {!isOwner && memberStatus === "none" && (
            <Button
              onClick={handleJoin}
              disabled={actionLoading}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 text-sm font-semibold"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {club.is_private ? "Request" : "Join Club"}
            </Button>
          )}
          {memberStatus === "pending" && (
            <div className="rounded-full bg-muted text-muted-foreground h-9 px-5 flex items-center text-sm font-semibold">
              Pending...
            </div>
          )}
          {memberStatus === "active" && !isOwner && !isAdmin && (
            <div className="rounded-full border border-primary text-primary h-9 px-5 flex items-center text-sm font-semibold gap-1.5">
              <Check className="w-3.5 h-3.5" /> Joined
            </div>
          )}
          {isAdmin && !isOwner && (
            <div className="rounded-full bg-primary text-primary-foreground h-9 px-5 flex items-center text-sm font-semibold">
              Admin
            </div>
          )}
        </div>
      </div>

      {/* Club info overlay */}
      <div className="container max-w-2xl -mt-10 relative z-10 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Logo + Name */}
          <div className="flex items-end gap-3 mb-3">
            <Avatar className="h-20 w-20 rounded-full border-4 border-background shadow-md bg-background">
              <AvatarImage src={club.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-card text-primary font-bold text-2xl rounded-full">
                {club.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          <h1 className="font-display text-[22px] font-bold leading-tight flex items-center gap-2">
            {club.name}
            {club.is_private && <Lock className="w-4 h-4 text-muted-foreground" />}
          </h1>

          {location && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" /> {location}
            </div>
          )}

          {/* Owner row */}
          {ownerProfile && (
            <div
              className="flex items-center gap-2 mt-2 cursor-pointer group"
              onClick={() => navigate(`/user/${club.owner_id}`)}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={ownerProfile.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-[10px]">{ownerProfile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Owned by <span className="font-semibold text-foreground">{ownerProfile.name}</span>
              </span>
            </div>
          )}

          {/* Description preview */}
          {club.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{club.description}</p>
          )}

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1 text-xs">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{membersCount}</span>
              <span className="text-muted-foreground">Members</span>
            </div>
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1 text-xs">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{gamesCount}</span>
              <span className="text-muted-foreground">Matches</span>
            </div>
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1 text-xs">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{upcomingCount}</span>
              <span className="text-muted-foreground">Upcoming</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-6 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-5">
            {activeTab === "feed" && <ClubFeedTab clubId={id!} isAdmin={isAdmin} clubLogo={club.logo_url} clubName={club.name} />}
            {activeTab === "matches" && <ClubMatchesTab clubId={id!} />}
            {activeTab === "members" && <ClubMembersTab clubId={id!} ownerId={club.owner_id} />}
            {activeTab === "about" && <ClubAboutTab club={club} ownerId={club.owner_id} />}
          </div>
        </motion.div>
      </div>

      {/* Admin Panel */}
      {adminOpen && (
        <ClubAdminPanel
          clubId={id!}
          club={club}
          isOwner={isOwner}
          onClose={() => setAdminOpen(false)}
          onClubUpdated={fetchClub}
        />
      )}
    </div>
  );
}
