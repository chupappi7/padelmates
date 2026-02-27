import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Calendar, MapPin, Globe, Instagram, MessageCircle, UserPlus, UserMinus, Megaphone } from "lucide-react";

interface Club {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export default function ClubDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [gamesCount, setGamesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [ownerName, setOwnerName] = useState("");

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

    setClub(data);

    // Fetch counts & follow status in parallel
    const [followersRes, gamesRes, ownerRes, followRes] = await Promise.all([
      supabase.from("club_followers").select("id", { count: "exact", head: true }).eq("club_id", id!),
      supabase.from("games").select("id", { count: "exact", head: true }).eq("club_id", id!),
      supabase.from("profiles").select("name").eq("user_id", data.owner_id).single(),
      user
        ? supabase.from("club_followers").select("id").eq("club_id", id!).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setFollowersCount(followersRes.count || 0);
    setGamesCount(gamesRes.count || 0);
    setOwnerName(ownerRes.data?.name || "Unknown");
    setIsFollowing(!!followRes.data);
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user) { navigate("/login"); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("club_followers").delete().eq("club_id", id!).eq("user_id", user.id);
        setIsFollowing(false);
        setFollowersCount((c) => c - 1);
        toast.success("Unfollowed");
      } else {
        await supabase.from("club_followers").insert({ club_id: id!, user_id: user.id });
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
        toast.success("Following!");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFollowLoading(false);
    }
  };

  // Parse social links from description
  const parseSocials = (desc: string | null) => {
    if (!desc) return { text: "", location: "", website: "", instagram: "", whatsapp: "" };
    const lines = desc.split("\n");
    let text = "", location = "", website = "", instagram = "", whatsapp = "";
    for (const line of lines) {
      if (line.startsWith("📍")) location = line.replace("📍 ", "");
      else if (line.startsWith("🌐")) website = line.replace("🌐 ", "");
      else if (line.startsWith("📸")) instagram = line.replace("📸 ", "");
      else if (line.startsWith("💬")) whatsapp = line.replace("💬 ", "");
      else if (line.trim()) text += (text ? "\n" : "") + line;
    }
    return { text, location, website, instagram, whatsapp };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-lg py-10">
          <div className="h-32 bg-card rounded-2xl animate-pulse mb-4" />
          <div className="h-20 bg-card rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!club) return null;

  const isOwner = user?.id === club.owner_id;
  const socials = parseSocials(club.description);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg py-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Back */}
          <Button variant="ghost" size="icon" onClick={() => navigate("/clubs")} className="mb-4">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Hero Card */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-20 w-20 rounded-2xl">
                <AvatarImage src={club.logo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl rounded-2xl">
                  {club.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold leading-tight break-words">{club.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">by {ownerName}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-foreground">{followersCount}</span> followers
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold text-foreground">{gamesCount}</span> games
              </div>
            </div>

            {/* Follow / Owner */}
            {!isOwner ? (
              <Button
                variant={isFollowing ? "outline" : "hero"}
                className="w-full"
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {isFollowing ? (
                  <><UserMinus className="w-4 h-4" /> Unfollow</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Follow</>
                )}
              </Button>
            ) : (
              <p className="text-xs text-center text-muted-foreground">You own this club</p>
            )}
          </div>

          {/* About */}
          {socials.text && (
            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <h3 className="font-display font-bold mb-2">About</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{socials.text}</p>
            </div>
          )}

          {/* Info chips */}
          {(socials.location || socials.website || socials.instagram || socials.whatsapp) && (
            <div className="bg-card border border-border rounded-2xl p-5 mb-4 space-y-3">
              <h3 className="font-display font-bold mb-1">Info</h3>
              {socials.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0" /> {socials.location}
                </div>
              )}
              {socials.website && (
                <a href={socials.website.startsWith("http") ? socials.website : `https://${socials.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Globe className="w-4 h-4 shrink-0" /> {socials.website}
                </a>
              )}
              {socials.instagram && (
                <a href={`https://instagram.com/${socials.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Instagram className="w-4 h-4 shrink-0" /> {socials.instagram}
                </a>
              )}
              {socials.whatsapp && (
                <a href={socials.whatsapp.startsWith("http") ? socials.whatsapp : `https://${socials.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp Group
                </a>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
