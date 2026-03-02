import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Target, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoIcon from "@/assets/logo-icon.png";

interface GameData {
  id: string;
  title: string;
  location: string;
  date_time: string;
  format: string;
  skill_level: number;
  max_players: number;
  host_id: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

interface PlayerProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

const formatLabel = (f: string) => {
  switch (f) {
    case "casual_match": return "Casual Match";
    case "americano": return "Americano";
    case "team_americano": return "Team Americano";
    default: return f;
  }
};

export default function JoinPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    const fetchData = async () => {
      const [gameRes, playersRes] = await Promise.all([
        supabase
          .from("games")
          .select("id, title, location, date_time, format, skill_level, max_players, host_id")
          .eq("id", gameId)
          .maybeSingle(),
        supabase
          .from("game_players")
          .select("user_id")
          .eq("game_id", gameId),
      ]);

      if (gameRes.data) {
        // Fetch host profile separately
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("user_id", gameRes.data.host_id)
          .maybeSingle();

        setGame({
          ...gameRes.data,
          profiles: hostProfile,
        } as GameData);
      }
      if (playersRes.data && playersRes.data.length > 0) {
        const playerIds = playersRes.data.map((p: any) => p.user_id);
        const { data: playerProfiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", playerIds);
        
        setPlayers(
          (playerProfiles || []).map((p) => ({
            user_id: p.user_id,
            name: p.name || "Player",
            avatar_url: p.avatar_url,
          }))
        );
      }
      setLoading(false);
    };

    fetchData();
  }, [gameId]);

  // Update OG meta tags dynamically
  useEffect(() => {
    if (!game) return;
    const spotsLeft = game.max_players - players.length;
    const hostName = game.profiles?.name || "Someone";
    const dateStr = format(new Date(game.date_time), "EEE d MMM · HH:mm");

    document.title = `Padel match at ${game.location} | Padelmates`;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", `Padel match at ${game.location}`);
    setMeta("og:description", `${dateStr} · ${spotsLeft} spots left · Hosted by ${hostName}`);
    setMeta("og:image", "https://padelmates.app/og-image.png");
    setMeta("og:url", `https://padelmates.app/join/${game.id}`);

    return () => { document.title = "Padelmates"; };
  }, [game, players]);

  const handleJoin = () => {
    if (user) {
      navigate(`/games/${gameId}`);
    } else {
      // Placeholder: in the future, deep link or app store
      navigate(`/games/${gameId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <img src={logoIcon} alt="Padelmates" className="w-12 h-12 mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Match not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This match may have been cancelled or doesn't exist.</p>
        <Button onClick={() => navigate("/")} variant="outline">Go to Padelmates</Button>
      </div>
    );
  }

  const spotsLeft = game.max_players - players.length;
  const hostName = game.profiles?.name || "Someone";
  const dateStr = format(new Date(game.date_time), "EEE d MMM · HH:mm");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="pt-8 pb-4 flex flex-col items-center">
        <img src={logoIcon} alt="Padelmates" className="w-14 h-14 mb-2" />
        <p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Padelmates</p>
      </div>

      {/* Match Card */}
      <div className="flex-1 px-5 pb-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-foreground">{game.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Hosted by {hostName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground truncate">{game.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{dateStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{formatLabel(game.format)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{spotsLeft} spots left</span>
            </div>
          </div>

          {/* Players */}
          {players.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Players joined</p>
              <div className="flex -space-x-2">
                {players.slice(0, 8).map((p) => (
                  <Avatar key={p.user_id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {players.length > 8 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                    <span className="text-xs font-medium text-muted-foreground">+{players.length - 8}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          onClick={handleJoin}
          className="w-full mt-5 h-12 text-base font-semibold bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl shadow-lg"
        >
          Join this match
        </Button>
      </div>

      {/* Footer */}
      <div className="py-5 text-center border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-medium text-foreground">Padelmates</span> · padelmates.app
        </p>
      </div>
    </div>
  );
}
