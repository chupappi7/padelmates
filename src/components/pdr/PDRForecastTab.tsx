import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, TrendingUp, TrendingDown, Info } from "lucide-react";
import { forecastPDR, formatPDR } from "@/lib/pdr";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SelectedPlayer {
  user_id: string;
  name: string;
  pdr_rating: number | null;
  pdr_rd: number;
  pdr_phase: string;
  avatar_url: string | null;
}

export function PDRForecastTab() {
  const [partner, setPartner] = useState<SelectedPlayer | null>(null);
  const [opponent1, setOpponent1] = useState<SelectedPlayer | null>(null);
  const [opponent2, setOpponent2] = useState<SelectedPlayer | null>(null);
  const [scoreMargin, setScoreMargin] = useState([50]); // 0=close, 100=dominant

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["profiles-pdr-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, pdr_rating, pdr_rd, pdr_phase");
      return data || [];
    },
  });

  const selectedIds = [partner?.user_id, opponent1?.user_id, opponent2?.user_id].filter(Boolean);

  // Use current user from profiles (first one as self)
  const ready = partner && opponent1 && opponent2 &&
    partner.pdr_rating != null && opponent1.pdr_rating != null && opponent2.pdr_rating != null;

  // Dummy self rating for forecast (user selects partner, opponents)
  // We need the user's own profile
  const { data: myProfile } = useQuery({
    queryKey: ["my-pdr-forecast"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return null;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, pdr_rating, pdr_rd, pdr_phase")
        .eq("user_id", u.id)
        .single();
      return data;
    },
  });

  const forecast = ready && myProfile?.pdr_rating != null
    ? forecastPDR(
        [myProfile.pdr_rating, partner.pdr_rating!] as [number, number],
        [myProfile.pdr_rd ?? 1.5, partner.pdr_rd ?? 1.5] as [number, number],
        [opponent1.pdr_rating!, opponent2.pdr_rating!] as [number, number],
        [opponent1.pdr_rd ?? 1.5, opponent2.pdr_rd ?? 1.5] as [number, number],
      )
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border p-4 space-y-4">
        <h3 className="text-sm font-semibold">PDR Forecast</h3>

        <PlayerSearchField
          label="With partner..."
          selected={partner}
          onSelect={(p) => setPartner(p as SelectedPlayer)}
          onRemove={() => setPartner(null)}
          excludeIds={selectedIds}
          profiles={allProfiles}
        />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-bold text-muted-foreground">VS</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <PlayerSearchField
          label="Opponent 1"
          selected={opponent1}
          onSelect={(p) => setOpponent1(p as SelectedPlayer)}
          onRemove={() => setOpponent1(null)}
          excludeIds={selectedIds}
          profiles={allProfiles}
        />
        <PlayerSearchField
          label="Opponent 2"
          selected={opponent2}
          onSelect={(p) => setOpponent2(p as SelectedPlayer)}
          onRemove={() => setOpponent2(null)}
          excludeIds={selectedIds}
          profiles={allProfiles}
        />
      </div>

      {forecast && (
        <div className="space-y-3">
          {/* Win Probability */}
          <div className="bg-card rounded-2xl border p-4 space-y-3">
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
              <span className="text-sm font-bold w-14 text-right">{forecast.team1WinProb}%</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your Team</span>
              <span>Opponents — {forecast.team2WinProb}%</span>
            </div>
          </div>

          {/* PDR Changes */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Your Team", players: [myProfile, partner], ifWin: forecast.team1IfWin, ifLose: forecast.team1IfLose },
              { label: "Opponents", players: [opponent1, opponent2], ifWin: forecast.team2IfWin, ifLose: forecast.team2IfLose },
            ].map((team) => (
              <div key={team.label} className="bg-card rounded-2xl border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{team.label}</p>
                {team.players.map((p: any, i: number) => p && (
                  <div key={p.user_id} className="space-y-0.5">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span className="text-primary">+{Math.abs(team.ifWin[i]).toFixed(2)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <TrendingDown className="w-3 h-3 text-accent" />
                      <span className="text-accent">{team.ifLose[i].toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl border p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You gain more PDR by beating higher-rated opponents. Losing closely to a stronger team costs very little.
              </p>
            </div>
          </div>
        </div>
      )}

      {!forecast && myProfile?.pdr_phase === "calibrating" && (
        <div className="bg-card rounded-2xl border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Complete calibration (5 matches) to use the forecast tool.
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerSearchField({
  label, selected, onSelect, onRemove, excludeIds, profiles,
}: {
  label: string;
  selected: any;
  onSelect: (p: any) => void;
  onRemove: () => void;
  excludeIds: (string | undefined)[];
  profiles: any[];
}) {
  const [search, setSearch] = useState("");
  const filtered = profiles.filter(
    (p: any) => !excludeIds.includes(p.user_id) && p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={selected.avatar_url || ""} />
            <AvatarFallback className="text-[9px]">{selected.name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium flex-1">{selected.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatPDR(selected.pdr_rating, selected.pdr_phase)}
          </span>
          <button onClick={onRemove}><X className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
        {search.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((p: any) => (
              <button
                key={p.user_id}
                onClick={() => { onSelect(p); setSearch(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="text-[9px]">{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left">{p.name}</span>
                <span className="text-xs text-muted-foreground">{formatPDR(p.pdr_rating, p.pdr_phase)}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No players found</p>}
          </div>
        )}
      </div>
    </div>
  );
}
