import { useState } from "react";
import { PlayerSelector } from "./PlayerSelector";
import { forecastDoubles } from "@/lib/elo";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SelectedPlayer {
  id: string;
  user_id: string;
  name: string;
  elo_rating: number;
  avatar_url: string | null;
}

export function ForecastTab() {
  const [team1, setTeam1] = useState<SelectedPlayer[]>([]);
  const [team2, setTeam2] = useState<SelectedPlayer[]>([]);

  const ready = team1.length === 2 && team2.length === 2;

  const forecast = ready
    ? forecastDoubles(
        [team1[0].elo_rating, team1[1].elo_rating],
        [team2[0].elo_rating, team2[1].elo_rating]
      )
    : null;

  return (
    <div className="space-y-6">
      <PlayerSelector
        label="Team 1"
        selectedIds={team1.map((p) => p.user_id)}
        onSelect={(p) => setTeam1((prev) => [...prev, p])}
        onRemove={(uid) => setTeam1((prev) => prev.filter((p) => p.user_id !== uid))}
        max={2}
        excludeIds={team2.map((p) => p.user_id)}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs font-bold text-muted-foreground">VS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <PlayerSelector
        label="Team 2"
        selectedIds={team2.map((p) => p.user_id)}
        onSelect={(p) => setTeam2((prev) => [...prev, p])}
        onRemove={(uid) => setTeam2((prev) => prev.filter((p) => p.user_id !== uid))}
        max={2}
        excludeIds={team1.map((p) => p.user_id)}
      />

      {forecast && (
        <div className="space-y-4 pt-2">
          {/* Win Probability */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Win Probability</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${forecast.team1WinProb}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold w-16 text-right">{forecast.team1WinProb}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Team 1</span>
              <span>Team 2 — {forecast.team2WinProb}%</span>
            </div>
          </div>

          {/* ELO Changes */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Team 1", players: team1, ifWin: forecast.team1IfWin, ifLose: forecast.team1IfLose },
              { label: "Team 2", players: team2, ifWin: forecast.team2IfWin, ifLose: forecast.team2IfLose },
            ].map((team) => (
              <div key={team.label} className="bg-card rounded-xl border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{team.label}</p>
                {team.players.map((p, i) => (
                  <div key={p.user_id} className="space-y-0.5">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">+{team.ifWin[i]}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">{team.ifLose[i]}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
