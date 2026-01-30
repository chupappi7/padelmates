import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeScrollPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (time: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "15", "30", "45"];

export function TimeScrollPicker({ open, onOpenChange, value, onChange }: TimeScrollPickerProps) {
  const [selectedHour, selectedMinute] = value ? value.split(":") : ["18", "00"];
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Scroll to selected values
      setTimeout(() => {
        const hourIndex = hours.indexOf(selectedHour);
        const minuteIndex = minutes.indexOf(selectedMinute);
        
        if (hourRef.current && hourIndex !== -1) {
          const itemHeight = 48;
          hourRef.current.scrollTop = hourIndex * itemHeight - 96;
        }
        if (minuteRef.current && minuteIndex !== -1) {
          const itemHeight = 48;
          minuteRef.current.scrollTop = minuteIndex * itemHeight - 96;
        }
      }, 100);
    }
  }, [open, selectedHour, selectedMinute]);

  const handleSelect = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[300px] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center">Select Time</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center gap-2 px-4 pb-4">
          {/* Hour Scroll */}
          <div className="relative h-[240px] w-20 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/10 rounded-lg z-0" />
            <div
              ref={hourRef}
              className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="py-24">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => handleSelect(hour, selectedMinute)}
                    className={cn(
                      "w-full h-12 flex items-center justify-center text-2xl font-medium snap-center transition-all",
                      hour === selectedHour ? "text-primary scale-110" : "text-muted-foreground"
                    )}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <span className="text-3xl font-bold text-primary">:</span>

          {/* Minute Scroll */}
          <div className="relative h-[240px] w-20 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/10 rounded-lg z-0" />
            <div
              ref={minuteRef}
              className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="py-24">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleSelect(selectedHour, minute)}
                    className={cn(
                      "w-full h-12 flex items-center justify-center text-2xl font-medium snap-center transition-all",
                      minute === selectedMinute ? "text-primary scale-110" : "text-muted-foreground"
                    )}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 pt-0">
          <Button 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}