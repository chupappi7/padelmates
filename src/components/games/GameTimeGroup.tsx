import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns";

interface GameTimeGroupProps {
  dateTime: string;
}

export function GameTimeGroup({ dateTime }: GameTimeGroupProps) {
  const date = new Date(dateTime);
  
  let dayLabel: string;
  if (isToday(date)) {
    dayLabel = "Today";
  } else if (isTomorrow(date)) {
    dayLabel = "Tomorrow";
  } else {
    dayLabel = format(date, "MMM d, yyyy");
  }
  
  const timeLabel = format(date, "HH:mm");

  // Countdown for today/tomorrow only, and only if in the future
  let countdown: string | null = null;
  if (isToday(date) || isTomorrow(date)) {
    const minsUntil = differenceInMinutes(date, new Date());
    if (minsUntil > 0) {
      const hours = Math.floor(minsUntil / 60);
      const mins = minsUntil % 60;
      if (hours > 0 && mins > 0) {
        countdown = `in ${hours}h ${mins}m`;
      } else if (hours > 0) {
        countdown = `in ${hours}h`;
      } else {
        countdown = `in ${mins}m`;
      }
    }
  }

  return (
    <div className="col-span-full flex items-center gap-3 pt-4 pb-2 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
        <span className="text-sm font-medium text-primary">{timeLabel}</span>
      </div>
      <div className="flex-1 h-px bg-border" />
      {countdown && (
        <span className="text-[11px] font-medium text-primary shrink-0">{countdown}</span>
      )}
    </div>
  );
}
