import { getTier, getNextTier, formatPDR, calcReliability } from "@/lib/pdr";
import type { Tier } from "@/lib/pdr";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
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
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-b-3xl">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
        {/* Player Name */}
        <p className="text-center text-white/70 text-sm tracking-wide">
          {profile?.name || "Player"}
        </p>

        {/* Rating Display */}
        <div className="text-center mt-2">
          {phase === "calibrating" ? (
            <div className="space-y-3">
              <p className="text-white/90 text-lg font-semibold animate-pulse">
                Calibrating your PDR...
              </p>
              <p className="text-white/50 text-sm">
                Play {Math.max(0, 5 - matchCount)} more confirmed matches to get your first rating
              </p>
              {/* Circular progress */}
              <div className="flex justify-center mt-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="4" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="hsl(175, 84%, 32%)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${(matchCount / 5) * 213.6} 213.6`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{matchCount}/5</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <span
                className="text-[58px] leading-none font-extrabold text-white tracking-tight"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {formatPDR(rating, phase)}
              </span>

              {/* Tier Badge */}
              {tier && (
                <div className="flex justify-center mt-3">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border"
                    style={{
                      color: tier.color,
                      borderColor: `${tier.color}40`,
                      backgroundColor: `${tier.color}15`,
                    }}
                  >
                    <Trophy className="w-3 h-3" />
                    {phase === "provisional" ? "Provisional" : tier.name}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {nextTier && phase === "established" && (
                <div className="mt-4 max-w-[260px] mx-auto">
                  <div className="flex justify-between text-[10px] text-white/40 font-medium mb-1">
                    <span>{rating?.toFixed(2)}</span>
                    <span>{nextTier.min.toFixed(1)} to {nextTier.name}</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressToNext}%`, backgroundColor: tier?.color, opacity: 0.7 }}
                    />
                  </div>
                </div>
              )}

              {/* Reliability */}
              {phase === "provisional" && (
                <div className="mt-3 max-w-[200px] mx-auto">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-yellow-400/60"
                      style={{ width: `${reliability}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">Reliability: {reliability}%</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Stats Row */}
        {matchCount > 0 && (
          <div className="flex justify-center items-center gap-0 mt-6">
            {[
              { label: "W", value: wins },
              { label: "L", value: losses },
              { label: "Win Rate", value: `${winRate}%` },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center">
                {i > 0 && <div className="w-px h-5 bg-white/15 mx-4" />}
                <div className="text-center">
                  <p className="text-white font-semibold text-sm leading-none">{stat.value}</p>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              </div>
            ))}

            {/* Trend */}
            {trendDelta !== 0 && (
              <>
                <div className="w-px h-5 bg-white/15 mx-4" />
                <div className="flex items-center gap-1">
                  {trendDelta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(175, 84%, 32%)" }} />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" style={{ color: "hsl(28, 95%, 55%)" }} />
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: trendDelta > 0 ? "hsl(175, 84%, 32%)" : "hsl(28, 95%, 55%)" }}
                  >
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
