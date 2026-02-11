import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (time: string) => void;
}

const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

const periods = [
  { label: "Morning", range: [6, 12] },
  { label: "Afternoon", range: [12, 17] },
  { label: "Evening", range: [17, 22] },
  { label: "Night", range: [22, 6] },
] as const;

function getDefaultPeriod(time: string) {
  const hour = parseInt(time.split(":")[0]);
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Evening";
  return "Night";
}

function getSlotsForPeriod(period: string) {
  const p = periods.find((pr) => pr.label === period)!;
  return timeSlots.filter((slot) => {
    const h = parseInt(slot.split(":")[0]);
    if (p.range[0] < p.range[1]) {
      return h >= p.range[0] && h < p.range[1];
    }
    // Night wraps around
    return h >= p.range[0] || h < p.range[1];
  });
}

export function TimeScrollPicker({ open, onOpenChange, value, onChange }: TimeScrollPickerProps) {
  const [activePeriod, setActivePeriod] = useState(() => getDefaultPeriod(value));
  const slots = getSlotsForPeriod(activePeriod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center text-base">Select Time</DialogTitle>
        </DialogHeader>

        {/* Period tabs */}
        <div className="flex gap-1 px-4">
          {periods.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setActivePeriod(p.label)}
              className={cn(
                "flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors",
                activePeriod === p.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-4 gap-1.5 px-4 py-3 max-h-[280px] overflow-y-auto scrollbar-hide">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                onChange(slot);
                onOpenChange(false);
              }}
              className={cn(
                "h-10 rounded-lg text-sm font-medium transition-all",
                slot === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-foreground hover:bg-primary/10"
              )}
            >
              {slot}
            </button>
          ))}
        </div>

        <div className="p-4 pt-0">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
