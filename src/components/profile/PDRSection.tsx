interface PDRSectionProps {
  pdrRating: number | null;
}

export function PDRSection({ pdrRating }: PDRSectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <p
        className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Padel Dynamic Rating
      </p>
      <p
        className="text-3xl font-bold text-foreground tabular-nums leading-none"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        {pdrRating != null ? pdrRating.toFixed(2) : "NR"}
      </p>
    </div>
  );
}
