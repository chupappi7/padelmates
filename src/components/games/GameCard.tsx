import { Link } from "react-router-dom";
import { MapPin, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { differenceInHours } from "date-fns";
import { motion } from "framer-motion";

interface GameCardProps {
  id: string;
  title: string;
  location: string;
  dateTime: string;
  endDateTime?: string | null;
  skillLevel: number;
  format: "casual_match" | "americano" | "team_americano";
  maxPlayers: number;
  currentPlayers: number;
  prefilledCount?: number;
  pricePerPlayer: number;
  hostName: string;
  hostAvatar?: string;
  distance?: number;
  paymentMode?: string;
  priceMode?: string;
  userStatus?: "joined" | "hosting";
  courtTakenBy?: string | null;
  interestCount?: number;
}

const getSkillColor = (level: number) => {
  if (level <= 2) return "badge-beginner";
  if (level <= 3) return "badge-intermediate";
  return "badge-advanced";
};

const getUrgencyStyle = (dateTime: string) => {
  const now = new Date();
  const hoursUntil = differenceInHours(new Date(dateTime), now);
  if (hoursUntil < 0) return { card: "", pill: "bg-muted text-muted-foreground border-border" };
  if (hoursUntil < 3) return { card: "border-l-4 border-l-destructive", pill: "bg-destructive/15 text-destructive border-destructive/25" };
  if (hoursUntil < 12) return { card: "border-l-4 border-l-warning", pill: "bg-warning/15 text-warning border-warning/25" };
  if (hoursUntil < 24) return { card: "border-l-4 border-l-primary/60", pill: "bg-primary/10 text-primary border-primary/20" };
  return { card: "", pill: "bg-muted text-muted-foreground border-border" };
};

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

const formatDuration = (hrs: number) => {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export function GameCard({
  id,
  title,
  location,
  dateTime,
  endDateTime,
  skillLevel,
  maxPlayers,
  currentPlayers,
  prefilledCount = 0,
  pricePerPlayer,
  hostName,
  hostAvatar,
  distance,
  paymentMode,
  priceMode,
  userStatus,
  courtTakenBy,
  interestCount = 0,
}: GameCardProps) {
  const isCourtSharing = paymentMode === "court_sharing";
  const isCourtTaken = !!courtTakenBy;
  const totalPlayers = currentPlayers + prefilledCount;
  const spotsLeft = maxPlayers - totalPlayers;

  const durationHrs = endDateTime
    ? (new Date(endDateTime).getTime() - new Date(dateTime).getTime()) / 3600000
    : null;

  const urgency = getUrgencyStyle(dateTime);
  const showPrice = pricePerPlayer > 0 && (priceMode !== "free" || isCourtSharing);

  const spotsColor = spotsLeft <= 0
    ? "bg-destructive/15 text-destructive border-destructive/20"
    : spotsLeft <= 2
      ? "bg-warning/15 text-warning border-warning/20"
      : "bg-success/15 text-success border-success/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Link to={`/games/${id}`} className={`block card-game group overflow-hidden ${urgency.card}`}>
        <div className="p-3 sm:p-4 space-y-2">

          {/* Row 1: Title + Available/Taken badge (court) + Skill chip */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h3 className="font-display font-bold text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </h3>
              {isCourtSharing && (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold shrink-0 ${
                  isCourtTaken
                    ? "bg-destructive/10 text-destructive border-destructive/25"
                    : "bg-success/10 text-success border-success/25"
                }`}>
                  {isCourtTaken ? "Taken" : "Available"}
                </span>
              )}
            </div>
            <span className={`badge-skill text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 shrink-0 ${getSkillColor(skillLevel)}`}>
              Lvl {skillLevel}
            </span>
          </div>

          {/* Row 2: Location + distance */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
            <span className="truncate">{location}</span>
            {distance !== undefined && (
              <span className="text-primary/80 font-medium whitespace-nowrap shrink-0">· {formatDistance(distance)}</span>
            )}
          </div>

          {/* Row 3: Duration pill + status badges (excluding court sharing) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {durationHrs && durationHrs > 0 && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${urgency.pill}`}>
                <Clock className="w-3 h-3" />
                {formatDuration(durationHrs)}
              </span>
            )}
            {userStatus && !isCourtSharing && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${
                userStatus === "hosting"
                  ? "bg-primary/10 text-primary border-primary/25"
                  : "bg-success/10 text-success border-success/25"
              }`}>
                {userStatus === "hosting" ? "Hosting" : "Joined"}
              </span>
            )}
          </div>

          {/* Row 4: Host + spots + price */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0">
                <AvatarImage src={hostAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-[8px] sm:text-[9px] font-semibold">
                  {hostName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{hostName}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isCourtSharing && interestCount > 0 && (
                <span className="text-[9px] sm:text-[10px] text-primary/70 font-medium">
                  {interestCount} interested
                </span>
              )}
              {!isCourtSharing && paymentMode !== "spot_selling" && (() => {
                const isFull = spotsLeft <= 0;
                return (
                  <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold ${spotsColor}`}>
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {totalPlayers}/{maxPlayers}
                    {isFull ? " Full" : ` · ${spotsLeft} left`}
                  </span>
                );
              })()}
              {showPrice && (
                <span className="text-primary font-bold text-xs sm:text-sm">
                  {pricePerPlayer} Kč
                </span>
              )}
            </div>
          </div>

        </div>
      </Link>
    </motion.div>
  );
}
