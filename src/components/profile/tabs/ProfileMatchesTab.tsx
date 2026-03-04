import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MapPin, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const SPACE = "'Space Grotesk', system-ui, sans-serif";

interface PlayerInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  team: number;
  isSelf?: boolean;
}

interface MatchEntry {
  id: string;
  gameId: string;
  date: string;
  location: string;
  myScore: number;
  oppScore: number;
  result: "W" | "L";
  format: string;
  myTeamPlayers: PlayerInfo[];
  oppTeamPlayers: PlayerInfo[];
}

export function ProfileMatchesTab({ userId, isSelf = true }: { userId: string; isSelf?: boolean }) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [userId]);

  const fetchMatches = async () => {
    // 1. Get user's match_players
    const { data: playerRows } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("user_id", userId);

    if (!playerRows || playerRows.length === 0) { setLoading(false); return; }

    const matchIds = playerRows.map(p => p.match_id);
    const myTeamMap = new Map(playerRows.map(p => [p.match_id, p.team]));

    // 2. Get completed matches (limit 3)
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, team1_score, team2_score, status, created_at, game_id")
      .in("id", matchIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!matchesData || matchesData.length === 0) { setLoading(false); return; }

    // 3. Get game info
    const gameIds = [...new Set(matchesData.map(m => m.game_id))];
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, title, location, format")
      .in("id", gameIds);
    const gameMap = new Map(gamesData?.map(g => [g.id, g]) || []);

    // 4. Get all players for these matches
    const completedMatchIds = matchesData.map(m => m.id);
    const { data: allPlayersData } = await supabase
      .from("match_players")
      .select("match_id, user_id, team")
      .in("match_id", completedMatchIds);

    // 5. Get profile info for all players
    const allUserIds = [...new Set(allPlayersData?.map(p => p.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", allUserIds);
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    // 6. Build match entries
    setMatches(matchesData.map(m => {
      const myTeam = myTeamMap.get(m.id) || 1;
      const myScore = myTeam === 1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      const oppScore = myTeam === 1 ? (m.team2_score ?? 0) : (m.team1_score ?? 0);
      const game = gameMap.get(m.game_id);

      const matchPlayers = allPlayersData?.filter(p => p.match_id === m.id) || [];
      const myTeamPlayers = matchPlayers
        .filter(p => p.team === myTeam)
        .map(p => {
          const prof = profileMap.get(p.user_id);
          return {
            userId: p.user_id,
            name: prof?.name?.split(" ").map((n: string, i: number) => i === 0 ? n : n[0] + ".").join(" ") || "Unknown",
            avatarUrl: prof?.avatar_url || null,
            team: p.team,
            isSelf: p.user_id === userId,
          };
        })
        .sort((a, b) => (a.isSelf ? -1 : 0) - (b.isSelf ? -1 : 0));
      const oppTeamPlayers = matchPlayers
        .filter(p => p.team !== myTeam)
        .map(p => {
          const prof = profileMap.get(p.user_id);
          return {
            userId: p.user_id,
            name: prof?.name?.split(" ").map((n: string, i: number) => i === 0 ? n : n[0] + ".").join(" ") || "Unknown",
            avatarUrl: prof?.avatar_url || null,
            team: p.team,
          };
        });

      return {
        id: m.id,
        gameId: m.game_id,
        date: format(new Date(m.created_at), "MMM d"),
        location: game?.location || "Unknown",
        myScore,
        oppScore,
        result: (myScore > oppScore ? "W" : "L") as "W" | "L",
        format: game?.format?.replace(/_/g, " ") || "casual",
        myTeamPlayers,
        oppTeamPlayers,
      };
    }));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#E2E8F0] rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-8 text-center">
        <p className="text-[#64748B] text-sm font-medium">No matches yet</p>
        <p className="text-[#94A3B8] text-xs mt-1">Join or host a match to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map(m => (
        <div
          key={m.id}
          className="w-full bg-white shadow-sm border border-[#E2E8F0] rounded-2xl p-3 text-left"
        >
          {/* Header: format + location + date */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                m.result === "W"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-red-50 text-red-500 border border-red-200"
              }`} style={{ fontFamily: SPACE }}>
                {m.result}
              </div>
              <span className="text-[10px] text-[#94A3B8] capitalize">{m.format}</span>
              <span className="text-[#CBD5E1] text-[10px]">·</span>
              <span className="text-[10px] text-[#94A3B8] truncate max-w-[120px]">{m.location}</span>
            </div>
            <span className="text-[#CBD5E1] text-[10px] shrink-0">{m.date}</span>
          </div>

          {/* Score card: Team1 | Score | Team2 */}
          <div className="flex items-center">
            {/* My team — right aligned */}
            <div className="flex-1 min-w-0 text-right">
              {m.myTeamPlayers.map(p => (
                <div key={p.userId} className="flex items-center justify-end gap-1.5 py-0.5">
                  <span
                    className={`text-xs font-medium truncate ${p.isSelf ? "text-[#14b8a6] font-bold" : "text-[#0F172A] cursor-pointer hover:underline"}`}
                    onClick={() => !p.isSelf && navigate(`/user/${p.userId}`)}
                  >
                    {p.name}
                  </span>
                  <Avatar className={`w-5 h-5 ${!p.isSelf ? "cursor-pointer" : ""}`} onClick={() => !p.isSelf && navigate(`/user/${p.userId}`)}>
                    <AvatarImage src={p.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-[#F1F5F9] text-[#64748B]">{p.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>

            {/* Score center */}
            <div className="flex flex-col items-center px-3 shrink-0">
              <div className="flex items-center gap-1">
                <span className={`text-xl font-bold tabular-nums ${m.result === "W" ? "text-emerald-600" : "text-[#0F172A]"}`} style={{ fontFamily: SPACE }}>
                  {m.myScore}
                </span>
                <span className="text-[#CBD5E1] text-sm">–</span>
                <span className={`text-xl font-bold tabular-nums ${m.result === "L" ? "text-emerald-600" : "text-[#0F172A]"}`} style={{ fontFamily: SPACE }}>
                  {m.oppScore}
                </span>
              </div>
              <span className="text-[8px] text-[#CBD5E1] uppercase tracking-wider">Games</span>
            </div>

            {/* Opponent team — left aligned */}
            <div className="flex-1 min-w-0">
              {m.oppTeamPlayers.map(p => (
                <div key={p.userId} className="flex items-center gap-1.5 py-0.5">
                  <Avatar className="w-5 h-5 cursor-pointer" onClick={() => navigate(`/user/${p.userId}`)}>
                    <AvatarImage src={p.avatarUrl || undefined} />
                    <AvatarFallback className="text-[8px] bg-[#F1F5F9] text-[#64748B]">{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <span
                    className="text-[#0F172A] text-xs font-medium truncate cursor-pointer hover:underline"
                    onClick={() => navigate(`/user/${p.userId}`)}
                  >
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* View Full Match History */}
      <button
        onClick={() => navigate(isSelf ? "/match-history" : `/match-history/${userId}`)}
        className="w-full bg-white shadow-sm border border-[#E2E8F0] rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
      >
        <span className="text-[#64748B] text-xs font-medium">View Full Match History</span>
        <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
      </button>
    </div>
  );
}
