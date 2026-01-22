import { format, isToday, isTomorrow } from "date-fns";

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
    dayLabel = format(date, "EEE, MMM d");
  }
  
  const timeLabel = format(date, "h:mm a");

  return (
    <div className="col-span-full flex items-center gap-3 pt-4 pb-2 first:pt-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
        <span className="text-sm text-muted-foreground">•</span>
        <span className="text-sm font-medium text-primary">{timeLabel}</span>
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
