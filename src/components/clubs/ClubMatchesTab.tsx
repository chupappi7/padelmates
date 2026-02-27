import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Calendar, MapPin, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Game {
  id: string;
  title: string;
  date_time: string;
  end_date_time: string | null;
  location: string;
  max_players: number;
  format: string;
  player_count?: number;
}

export default function ClubMatchesTab({ clubId }: { clubId: string }) {
  const [upcoming, setUpcoming] = useState<Game[]>([]);
  const [past, setPast] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, [clubId]);

  const fetchGames = async () => {
    const now = new Date().toISOString();

    const [upRes, pastRes] = await Promise.all([
      supabase
        .from("games")
        .select("id, title, date_time, end_date_time, location, max_players, format")
        .eq("club_id", clubId)
        .gte("date_time", now)
        .order("date_time", { ascending: true }),
      supabase
        .from("games")
        .select("id, title, date_time, end_date_time, location, max_players, format")
        .eq("club_id", clubId)
        .lt("date_time", now)
        .order("date_time", { ascending: false })
        .limit(20),
    ]);

    const allGames = [...(upRes.data || []), ...(pastRes.data || [])];
    if (allGames.length > 0) {
      const gameIds = allGames.map(g => g.id);
      const { data: players } = await supabase
        .from("game_players")
        .select("game_id")
        .in("game_id", gameIds);

      const countMap = new Map<string, number>();
      players?.forEach(p => countMap.set(p.game_id, (countMap.get(p.game_id) || 0) + 1));

      const addCounts = (games: Game[]) => games.map(g => ({ ...g, player_count: countMap.get(g.id) || 0 }));
      setUpcoming(addCounts(upRes.data || []));
      setPast(addCounts(pastRes.data || []));
    } else {
      setUpcoming([]);
      setPast([]);
    }
    setLoading(false);
  };

  const formatLabel = (f: string) => {
    if (f === "americano") return "Tournament";
    if (f === "team_americano") return "Team Tournament";
    return "Match";
  };

  const GameCard = ({ game }: { game: Game }) => (
    <div
      onClick={() => navigate(`/games/${game.id}`)}
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant="secondary" className="text-[10px]">{formatLabel(game.format)}</Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="w-3 h-3" />
          {game.player_count}/{game.max_players}
        </span>
      </div>
      <h4 className="font-display font-bold text-sm mb-1.5 line-clamp-1">{game.title}</h4>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(game.date_time), "MMM d · HH:mm")}
          {game.end_date_time && ` – ${format(new Date(game.end_date_time), "HH:mm")}`}
        </span>
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {game.location}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-bold mb-1">No upcoming matches</h3>
        <p className="text-sm text-muted-foreground">Admins can create events from the club dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm text-muted-foreground mb-3">Upcoming</h3>
          <div className="space-y-2.5">
            {upcoming.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <button
            onClick={() => setPastOpen(!pastOpen)}
            className="flex items-center gap-1.5 font-display font-bold text-sm text-muted-foreground mb-3"
          >
            Past
            {pastOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {pastOpen && (
            <div className="space-y-2.5">
              {past.map(g => <GameCard key={g.id} game={g} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
