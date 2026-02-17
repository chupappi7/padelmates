import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Users } from "lucide-react";
import { format as formatDate } from "date-fns";
import { motion } from "framer-motion";
import { getSkillLabel } from "./SkillBadge";

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
}

const formatLabels = {
  casual_match: "Casual Match",
  americano: "Americano",
  team_americano: "Team Americano",
};

const getSkillColor = (level: number) => {
  if (level <= 2) return "badge-beginner";
  if (level <= 3) return "badge-intermediate";
  return "badge-advanced";
};

export function GameCard({
  id,
  title,
  location,
  dateTime,
  endDateTime,
  skillLevel,
  format,
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
}: GameCardProps) {
  const totalPlayers = currentPlayers + prefilledCount;
  const spotsLeft = maxPlayers - totalPlayers;
  const date = new Date(dateTime);
  const durationHrs = endDateTime
    ? (new Date(endDateTime).getTime() - date.getTime()) / 3600000
    : null;

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Link to={`/games/${id}`} className="block card-game group">
        <div className="p-3 sm:p-5">
          {/* Header row: badges + price */}
          <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className={`badge-skill text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 ${getSkillColor(skillLevel)}`}>
                Lvl {skillLevel}
              </span>
              <Badge variant="outline" className="rounded-full text-[9px] sm:text-xs h-4 sm:h-6 px-1.5 sm:px-2 truncate">
                {formatLabels[format]}
              </Badge>
              {userStatus && (
                <Badge className={`rounded-full text-[9px] sm:text-xs h-4 sm:h-6 px-1.5 sm:px-2 border ${
                  userStatus === "hosting"
                    ? "bg-primary/15 text-primary border-primary/25"
                    : "bg-success/15 text-success border-success/25"
                }`}>
                  {userStatus === "hosting" ? "Hosting" : "Joined"}
                </Badge>
              )}
            </div>
            {pricePerPlayer > 0 && priceMode !== 'free' ? (
              <span className="text-primary font-bold text-xs sm:text-sm whitespace-nowrap">
                {pricePerPlayer} Kč
              </span>
            ) : null}
          </div>

          {/* Title + details in compact row on mobile */}
          <div className="flex items-start gap-3 sm:block">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm sm:text-lg mb-1 sm:mb-2 group-hover:text-primary transition-colors line-clamp-1">
                {title}
              </h3>
              
              {/* Compact info row on mobile, stacked on desktop */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:space-y-2 sm:flex-col sm:items-start text-[11px] sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1 sm:gap-2">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{location}</span>
                  {distance !== undefined && (
                    <span className="text-primary font-medium whitespace-nowrap">
                      · {formatDistance(distance)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                  <span className="whitespace-nowrap">
                    {formatDate(date, "EEE, MMM d, yyyy · h:mm a")}
                    {durationHrs && durationHrs > 0 && (
                      <span className="text-primary font-medium ml-0.5 sm:ml-1">· {durationHrs % 1 === 0 ? durationHrs : durationHrs.toFixed(1)}h</span>
                    )}
                  </span>
                </div>
                {paymentMode !== 'court_sharing' && paymentMode !== 'spot_selling' && (() => {
                  const ratio = totalPlayers / maxPlayers;
                  const isFull = spotsLeft <= 0;
                  const bubbleColor = isFull
                    ? "bg-destructive/15 text-destructive border-destructive/20"
                    : spotsLeft <= 2
                      ? "bg-warning/15 text-warning border-warning/20"
                      : "bg-success/15 text-success border-success/20";
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${bubbleColor}`}>
                      <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {totalPlayers}/{maxPlayers}
                      {isFull ? " Full" : ` · ${spotsLeft} left`}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Host footer - more compact */}
          <div className="flex items-center gap-2 pt-2 sm:pt-3 mt-2 sm:mt-4 border-t border-border">
            <Avatar className="h-5 w-5 sm:h-8 sm:w-8">
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-[8px] sm:text-xs font-semibold">
                {hostName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] sm:text-sm truncate text-muted-foreground">
              <span className="font-medium text-foreground">{hostName}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
