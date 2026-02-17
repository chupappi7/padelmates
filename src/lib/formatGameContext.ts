import { format } from "date-fns";

export const formatGameContext = (
  location: string,
  dateTime: string,
  current?: number,
  max?: number
) => {
  const d = new Date(dateTime);
  const dateStr = format(d, "MMM d, h:mm a");
  const countStr =
    current !== undefined && max !== undefined ? ` · ${current}/${max}` : "";
  return `${location} · ${dateStr}${countStr}`;
};
