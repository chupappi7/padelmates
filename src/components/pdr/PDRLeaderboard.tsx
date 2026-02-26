import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getTier, formatPDR, calcReliability } from "@/lib/pdr";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface PDRLeaderboardProps {
  currentUserId?: string;
}

export function PDRLeaderboard({ currentUserId }: PDRLeaderboardProps) {
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [showProvisional, setShowProvisional] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["pdr-leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, pdr_rating, pdr_rd, pdr_phase, pdr_matches_count, pdr_reliability")
        .not("pdr_rating", "is", null)
        .order("pdr_rating", { ascending: false });
      return data || [];
    },
  });

  const filtered = profiles.filter((p: any) => {
    if (p.pdr_phase === "calibrating") return false;
    if (!showProvisional && p.pdr_phase === "provisional") return false;
    return true;
  });

  const currentUserInList = filtered.findIndex((p: any) => p.user_id === currentUserId);
  const currentUserProfile = profiles.find((p: any) => p.user_id === currentUserId);

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Leaderboard
        </h3>
        <button
          onClick={() => setShowProvisional(!showProvisional)}
          className={cn(
            "text-[10px] px-2 py-1 rounded-full border transition-colors",
            showProvisional ? "bg-yellow-50 border-yellow-200 text-yellow-700" : "border-border text-muted-foreground"
          )}
        >
          {showProvisional ? "Hide" : "Show"} Provisional
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No rated players yet
          </div>
        ) : (
          filtered.slice(0, 20).map((p: any, i: number) => {
            const tier = getTier(p.pdr_rating);
            const isMe = p.user_id === currentUserId;
            return (
              <div
                key={p.user_id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  isMe && "bg-primary/5"
                )}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                  {i + 1}
                </span>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={p.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ color: tier.color, backgroundColor: `${tier.color}15` }}
                    >
                      {tier.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.pdr_matches_count}W
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: tier.color }}>
                    {formatPDR(p.pdr_rating, p.pdr_phase)}
                  </p>
                  <div className="w-12 h-1 rounded-full bg-muted mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.pdr_reliability}%`,
                        backgroundColor: tier.color,
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pinned current user if not in visible range */}
      {currentUserProfile && currentUserInList === -1 && currentUserProfile.pdr_phase !== "calibrating" && (
        <div className="border-t-2 border-primary/20 bg-primary/5 flex items-center gap-3 px-4 py-2.5">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right">—</span>
          <Avatar className="w-8 h-8">
            <AvatarImage src={currentUserProfile.avatar_url || ""} />
            <AvatarFallback className="text-[10px]">{currentUserProfile.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUserProfile.name} (You)</p>
          </div>
          <p className="text-sm font-bold text-primary">
            {formatPDR(currentUserProfile.pdr_rating, currentUserProfile.pdr_phase)}
          </p>
        </div>
      )}
    </div>
  );
}
