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
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-2">
              <span className={`badge-skill ${skillColors[skillLevel]}`}>
                {skillLevel}
              </span>
              <Badge variant="outline" className="rounded-full">
                {formatLabels[format]}
              </Badge>
            </div>
            {pricePerPlayer > 0 && (
              <div className="flex items-center gap-1 font-bold text-primary">
                <Euro className="w-4 h-4" />
                {pricePerPlayer}
              </div>
            )}
          </div>

          <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formatDate(date, "EEE, MMM d · h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>
                {currentPlayers}/{maxPlayers} players
                {spotsLeft > 0 && (
                  <span className="text-success ml-1">· {spotsLeft} spots left</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <Avatar className="h-8 w-8">
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {hostName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">
              Hosted by <span className="font-semibold">{hostName}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
