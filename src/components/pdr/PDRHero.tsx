import { getTier, getNextTier, formatPDR } from "@/lib/pdr";
import type { Tier } from "@/lib/pdr";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PDRHeroProps {
  profile: any;
  wins: number;
  losses: number;
  winRate: number;
  trendDelta: number;
  tier: Tier | null;
}

export function PDRHero({ profile, wins, losses, winRate, trendDelta, tier }: PDRHeroProps) {
  const phase = profile?.pdr_phase ?? "calibrating";
  const rating = profile?.pdr_rating;
  const matchCount = profile?.pdr_matches_count ?? 0;
  const reliability = profile?.pdr_reliability ?? 0;
  const nextTier = rating ? getNextTier(rating) : null;

  const progressToNext = tier && nextTier
    ? Math.min(100, Math.max(0, ((rating! - tier.min) / (tier.max - tier.min)) * 100))
    : tier && !nextTier ? 100 : 0;

  return (
    <div className="max-w-lg mx-auto px-4 mt-2">
      <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl px-5 pt-2.5 pb-5 relative">
        <p className="text-right text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium mb-2" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Padel Dynamic Rating</p>
        {/* Avatar + Name + Rating */}
        <div className="flex items-center gap-5">
          <Avatar className="w-16 h-16 border-2 border-white/15 shrink-0">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-xl bg-white/10 text-white font-semibold">
              {profile?.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-[15px] font-medium truncate">{profile?.name || "Player"}</p>

            {phase === "calibrating" ? (
              <div className="flex items-center gap-3 mt-1">
                <span
                  className="text-[40px] leading-none font-extrabold text-white/35 tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  NR
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-[11px] text-white/40 font-medium leading-none">Not Rated</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-5 h-[5px] rounded-full transition-all",
                            i < matchCount ? "bg-primary" : "bg-white/15"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-white/30 font-medium">{matchCount}/5</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2.5 mt-1">
                <span
                  className="text-[40px] leading-none font-extrabold text-white tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {formatPDR(rating, phase)}
                </span>
                {tier && (
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                    style={{
                      color: tier.color,
                      borderColor: `${tier.color}40`,
                      backgroundColor: `${tier.color}15`,
                    }}
                  >
                    {phase === "provisional" ? "Prov" : tier.name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar — established only */}
        {nextTier && phase === "established" && (
          <div className="mt-3 ml-[4.5rem]">
            <div className="flex justify-between text-[9px] text-white/35 font-medium mb-0.5">
              <span>{rating?.toFixed(2)}</span>
              <span>{nextTier.min.toFixed(1)} → {nextTier.name}</span>
            </div>
            <div className="h-[2px] rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressToNext}%`, backgroundColor: tier?.color, opacity: 0.7 }}
              />
            </div>
          </div>
        )}

        {/* Reliability — provisional only */}
        {phase === "provisional" && (
          <div className="mt-2 ml-[4.5rem] max-w-[160px]">
            <div className="h-[2px] rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all bg-yellow-400/60" style={{ width: `${reliability}%` }} />
            </div>
            <p className="text-[9px] text-white/30 mt-0.5">{reliability}% reliable</p>
          </div>
        )}

        {/* Stats Row — compact */}
        {matchCount > 0 && (
          <div className="flex items-center gap-0 mt-4 ml-[4.5rem]">
            {[
              { label: "W", value: wins },
              { label: "L", value: losses },
              { label: "Win", value: `${winRate}%` },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="w-px h-4 bg-white/15 mx-3" />}
                <div>
                  <span className="text-white font-semibold text-xs">{stat.value}</span>
                  <span className="text-white/35 text-[9px] ml-1">{stat.label}</span>
                </div>
              </div>
            ))}

            {trendDelta !== 0 && (
              <>
                <div className="w-px h-4 bg-white/15 mx-3" />
                <div className="flex items-center gap-0.5">
                  {trendDelta > 0 ? (
                    <TrendingUp className="w-3 h-3 text-primary" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-accent" />
                  )}
                  <span className={cn("text-xs font-semibold", trendDelta > 0 ? "text-primary" : "text-accent")}>
                    {trendDelta > 0 ? "+" : ""}{trendDelta.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
