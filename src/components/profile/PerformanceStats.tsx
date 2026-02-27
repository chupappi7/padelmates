interface PerformanceStatsProps {
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function PerformanceStats({
  matches,
  wins,
  losses,
  winRate,
}: PerformanceStatsProps) {
  const stats = [
    { label: "Matches Played", value: matches },
    { label: "Wins", value: wins },
    { label: "Losses", value: losses },
    { label: "Win %", value: `${winRate}%` },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3
          className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Performance
        </h3>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span
                className="text-sm font-semibold text-foreground tabular-nums"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
