import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MapPin } from "lucide-react";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface MatchEntry {
  id: string;
  date: string;
  location: string;
  score: string;
  result: "W" | "L";
  format: string;
}

export function ProfileMatchesTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [userId]);

  const fetchMatches = async () => {
    const { data: playerRows } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", userId);

    if (!playerRows || playerRows.length === 0) { setLoading(false); return; }

    const matchIds = playerRows.map(p => p.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status, created_at, game_id")
      .in("id", matchIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!matchesData || matchesData.length === 0) { setLoading(false); return; }

    const gameIds = [...new Set(matchesData.map(m => m.game_id))];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, title, location, format")
      .in("id", gameIds);

    const gameMap = new Map(gamesData?.map(g => [g.id, g]) || []);

    setMatches(matchesData.map(m => {
      const mp = playerRows.find(p => p.match_id === m.id);
      const myTeam = mp?.team || 1;
      const myScore = myTeam === 1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      const oppScore = myTeam === 1 ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
      const game = gameMap.get(m.game_id);
      return {
        id: m.id,
        date: format(new Date(m.created_at), "MMM d, yyyy"),
        location: game?.location || "Unknown",
        score: `${myScore}–${oppScore}`,
        result: (myScore > oppScore ? "W" : "L") as "W" | "L",
        format: game?.format?.replace(/_/g, " ") || "casual",
      };
    }));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
        <p className="text-white/40 text-sm">No completed matches yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map(m => (
        <div key={m.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3.5 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
            m.result === "W" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`} style={{ fontFamily: SPACE }}>
            {m.result}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm tabular-nums" style={{ fontFamily: SPACE }}>{m.score}</span>
              <span className="text-white/30 text-[10px]">{m.date}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-white/30" />
              <span className="text-white/40 text-xs truncate">{m.location}</span>
            </div>
            <span className="text-[10px] text-white/30 uppercase tracking-wider capitalize">{m.format}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
