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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/games/${id}`} className="block card-game group">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span className={`badge-skill text-[10px] sm:text-xs px-2 sm:px-3 ${skillColors[skillLevel]}`}>
                {skillLevel}
              </span>
              <Badge variant="outline" className="rounded-full text-[10px] sm:text-xs h-5 sm:h-6 px-2">
                {formatLabels[format]}
              </Badge>
            </div>
            {pricePerPlayer > 0 && (
              <div className="flex items-center gap-0.5 font-bold text-primary text-sm sm:text-base">
                <Euro className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {pricePerPlayer}
              </div>
            )}
          </div>

          <h3 className="font-display font-bold text-base sm:text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>

          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span>{formatDate(date, "EEE, MMM d · h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
              <span>
                {currentPlayers}/{maxPlayers} players
                {spotsLeft > 0 && (
                  <span className="text-success ml-1">· {spotsLeft} left</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 pt-2.5 sm:pt-3 border-t border-border">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs font-semibold">
                {hostName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm truncate">
              Hosted by <span className="font-semibold">{hostName}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
