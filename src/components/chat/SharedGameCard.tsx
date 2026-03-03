import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MapPin, Calendar, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkillBadge } from "@/components/games/SkillBadge";

interface SharedGameCardProps {
  gameId: string;
  title: string;
}

interface GamePreview {
  title: string;
  location: string;
  court_number: string | null;
  date_time: string;
  end_date_time: string | null;
  skill_level: number;
  max_players: number;
  format: string;
  prefilled_players: unknown;
}

export function SharedGameCard({ gameId, title }: SharedGameCardProps) {
  const navigate = useNavigate();
  const [game, setGame] = useState<GamePreview | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("games")
          .select("title, location, court_number, date_time, end_date_time, skill_level, max_players, format, prefilled_players")
          .eq("id", gameId)
          .single(),
        supabase
          .from("game_players")
          .select("id", { count: "exact", head: true })
          .eq("game_id", gameId),
      ]);
      if (data) setGame(data as GamePreview);
      setPlayerCount(count || 0);
    };
    fetch();
  }, [gameId]);

  const handleClick = () => navigate(`/games/${gameId}`);

  // Fallback while loading or if game not found
  if (!game) {
    return (
      <button
        onClick={handleClick}
        className="w-full text-left rounded-xl border border-primary/20 bg-background p-3 hover:border-primary/40 transition-colors"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">Shared Match</p>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
          <ChevronRight className="w-3 h-3" />
          View Match
        </div>
      </button>
    );
  }

  const dateObj = new Date(game.date_time);
  const dateStr = format(dateObj, "EEE, MMM d");
  const startTime = format(dateObj, "HH:mm");
  const endTime = game.end_date_time ? format(new Date(game.end_date_time), "HH:mm") : null;
  const locationStr = game.court_number ? `${game.location} · Court ${game.court_number}` : game.location;

  // Calculate total players including prefilled
  const prefilledCount = Array.isArray(game.prefilled_players) ? game.prefilled_players.length : 0;
  const totalPlayers = playerCount + prefilledCount;
  const spotsLeft = game.max_players - totalPlayers;

  const isFull = spotsLeft <= 0;

  return (
    <button
      onClick={handleClick}
      className="w-full text-left rounded-xl border border-primary/20 bg-background p-3 hover:border-primary/40 transition-colors space-y-2"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-0.5">Shared Match</p>
          <p className="text-sm font-bold line-clamp-2 text-foreground">{game.title}</p>
        </div>
        <SkillBadge level={game.skill_level} size="sm" />
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="break-words">{locationStr}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{dateStr} · {startTime}{endTime ? ` – ${endTime}` : ""}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className={cn(
            "font-semibold",
            spotsLeft <= 0 ? "text-destructive" : spotsLeft <= 2 ? "text-warning" : "text-success"
          )}>
            {totalPlayers}/{game.max_players}{isFull ? " · Full" : ` · ${spotsLeft} left`}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-1 text-xs text-primary font-semibold pt-0.5">
        <ChevronRight className="w-3.5 h-3.5" />
        View Match
      </div>
    </button>
  );
}
