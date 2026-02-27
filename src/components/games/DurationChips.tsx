import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

const DURATION_OPTIONS = [60, 90, 120] as const;

interface DurationChipsProps {
  duration: number;
  onDurationChange: (duration: number) => void;
  selectedTime: string;
}

export function DurationChips({ duration, onDurationChange, selectedTime }: DurationChipsProps) {
  const isPreset = DURATION_OPTIONS.includes(duration as any);
  const [showCustom, setShowCustom] = useState(!isPreset);

  const endTime = useMemo(() => {
    const [h, m] = selectedTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
  }, [selectedTime, duration]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { setShowCustom(false); onDurationChange(opt); }}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all border-2 ${
              duration === opt && !showCustom
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            {opt} min
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all border-2 ${
            showCustom
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/50"
          }`}
        >
          Other
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="15"
            max="480"
            step="15"
            placeholder="Minutes"
            value={duration}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v > 0) onDurationChange(v);
            }}
            className="h-10 w-28"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Ends at <span className="font-medium text-foreground">{endTime}</span></span>
      </div>
    </div>
  );
}

export function snapToDuration(minutes: number): number {
  const options = [60, 90, 120];
  return options.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
  );
}
