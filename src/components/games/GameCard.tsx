import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Users, Euro } from "lucide-react";
import { format as formatDate } from "date-fns";
import { motion } from "framer-motion";

interface GameCardProps {
  id: string;
  title: string;
  location: string;
  dateTime: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  format: "casual_match" | "americano" | "team_americano";
  maxPlayers: number;
  currentPlayers: number;
  pricePerPlayer: number;
  hostName: string;
  hostAvatar?: string;
}

const formatLabels = {
  casual_match: "Casual Match",
  americano: "Americano",
  team_americano: "Team Americano",
};

const skillColors = {
  beginner: "badge-beginner",
  intermediate: "badge-intermediate",
  advanced: "badge-advanced",
};

export function GameCard({
  id,
  title,
  location,
  dateTime,
  skillLevel,
  format,
  maxPlayers,
  currentPlayers,
  pricePerPlayer,
  hostName,
  hostAvatar,
}: GameCardProps) {
  const spotsLeft = maxPlayers - currentPlayers;
  const date = new Date(dateTime);

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
              <span className={`badge-skill text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 ${skillColors[skillLevel]}`}>
                {skillLevel.slice(0, 3).toUpperCase()}
              </span>
              <Badge variant="outline" className="rounded-full text-[9px] sm:text-xs h-4 sm:h-6 px-1.5 sm:px-2 truncate">
                {formatLabels[format]}
              </Badge>
            </div>
            {pricePerPlayer > 0 && (
              <div className="flex items-center gap-0.5 font-bold text-primary text-xs sm:text-base shrink-0">
                <Euro className="w-3 h-3 sm:w-4 sm:h-4" />
                {pricePerPlayer}
              </div>
            )}
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
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                  <span className="whitespace-nowrap">{formatDate(date, "EEE, MMM d · h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
                  <span className="whitespace-nowrap">
                    {currentPlayers}/{maxPlayers}
                    {spotsLeft > 0 && (
                      <span className="text-success ml-0.5 sm:ml-1">· {spotsLeft} left</span>
                    )}
                  </span>
                </div>
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
