import { useRef, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface DayPickerProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  daysToShow?: number;
}

export function DayPicker({ selectedDate, onSelectDate, daysToShow = 14 }: DayPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(today, i));

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1"
    >
      {/* All button */}
      <button
        data-selected={selectedDate === null}
        onClick={() => onSelectDate(null)}
        className={cn(
          "flex flex-col items-center justify-center shrink-0 w-11 h-14 rounded-xl transition-all text-center",
          selectedDate === null
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-card border border-border hover:border-primary/40"
        )}
      >
        <span className={cn(
          "text-[10px] font-medium uppercase",
          selectedDate === null ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          All
        </span>
        <span className={cn(
          "text-base font-bold leading-tight",
          selectedDate === null ? "text-primary-foreground" : "text-foreground"
        )}>
          ✦
        </span>
      </button>

      {days.map((day) => {
        const isSelected = selectedDate !== null && isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);

        return (
          <button
            key={day.toISOString()}
            data-selected={isSelected}
            onClick={() => onSelectDate(isSelected ? null : day)}
            className={cn(
              "flex flex-col items-center justify-center shrink-0 w-11 h-14 rounded-xl transition-all text-center",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border hover:border-primary/40"
            )}
          >
            <span className={cn(
              "text-[10px] font-medium uppercase",
              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {isToday ? "Today" : format(day, "EEE")}
            </span>
            <span className={cn(
              "text-base font-bold leading-tight",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}>
              {format(day, "d")}
            </span>
            <span className={cn(
              "text-[9px]",
              isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {format(day, "MMM")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
