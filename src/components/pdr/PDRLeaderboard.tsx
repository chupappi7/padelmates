import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTier, formatPDR } from "@/lib/pdr";
import { cn } from "@/lib/utils";
import { Trophy, MapPin } from "lucide-react";

interface PDRLeaderboardProps {
  currentUserId?: string;
}

export function PDRLeaderboard({ currentUserId }: PDRLeaderboardProps) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["pdr-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, pdr_rating, pdr_rd, pdr_phase, pdr_matches_count, pdr_reliability, region")
        .order("pdr_rating", { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  // Sort: established first, then provisional, then calibrating (NR)
  const sorted = [...profiles].sort((a: any, b: any) => {
    const phaseOrder = (p: string) => p === "established" ? 0 : p === "provisional" ? 1 : 2;
    const diff = phaseOrder(a.pdr_phase) - phaseOrder(b.pdr_phase);
    if (diff !== 0) return diff;
    // Within same phase, sort by rating desc (nulls last)
    const ra = a.pdr_rating ?? -1;
    const rb = b.pdr_rating ?? -1;
    return rb - ra;
  });

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Leaderboard
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {profiles.length} players
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No players yet
          </div>
        ) : (
          sorted.map((p: any, i: number) => {
            const isCalibrating = p.pdr_phase === "calibrating";
            const tier = isCalibrating ? null : getTier(p.pdr_rating);
            const isMe = p.user_id === currentUserId;
            const ratingDisplay = isCalibrating
              ? "NR"
              : formatPDR(p.pdr_rating, p.pdr_phase);

            return (
              <div
                key={p.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  isMe && "bg-primary/5"
                )}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                  {isCalibrating ? "—" : i + 1}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.name}
                    {isMe && <span className="text-muted-foreground text-[10px] ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {tier && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ color: tier.color, backgroundColor: `${tier.color}15` }}
                      >
                        {tier.name}
                      </span>
                    )}
                    {p.region && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {p.region}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn("text-sm font-bold", isCalibrating && "text-muted-foreground")}
                    style={tier ? { color: tier.color } : undefined}
                  >
                    {ratingDisplay}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
