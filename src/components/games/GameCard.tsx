import { Link } from "react-router-dom";
import { MapPin, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { differenceInHours, format } from "date-fns";
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
  clubName?: string;
  clubLogo?: string;
  clubId?: string;
  distance?: number;
  paymentMode?: string;
  priceMode?: string;
  userStatus?: "joined" | "hosting" | "requested" | "court_secured";
  courtTakenBy?: string | null;
  interestCount?: number;
}

const getSkillColor = (level: number) => {
  const map: Record<number, string> = { 4: "badge-skill-a", 3: "badge-skill-b", 2: "badge-skill-c", 1: "badge-skill-d" };
  return map[level] ?? "badge-skill-c";
};

const getUrgencyPill = () => "bg-primary/15 text-primary border-primary/25";

// Role-based left border accent
const getRoleAccent = (userStatus?: "joined" | "hosting" | "requested" | "court_secured") => {
  switch (userStatus) {
    case "hosting":        return "border-l-4 border-l-orange-400";
    case "joined":         return "border-l-4 border-l-emerald-500";
    case "requested":      return "border-l-4 border-l-yellow-400";
    case "court_secured":  return "border-l-4 border-l-emerald-500";
    default:               return "border-l-4 border-l-muted-foreground/40";
  }
};

const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

const formatTimeRange = (start: string, end?: string | null) => {
  const s = format(new Date(start), "HH:mm");
  if (!end) return s;
  const e = format(new Date(end), "HH:mm");
  return `${s} – ${e}`;
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
  clubName,
  clubLogo,
  clubId,
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

  const urgencyPill = getUrgencyPill();
  const roleAccent = getRoleAccent(userStatus);
  const showPrice = pricePerPlayer > 0 && (priceMode !== "free" || isCourtSharing);

  const spotsColor = spotsLeft <= 0
    ? "bg-destructive/15 text-destructive border-destructive/20"
    : spotsLeft <= 2
      ? "bg-warning/15 text-warning border-warning/20"
      : "bg-success/15 text-success border-success/20";

  // Role pill styles
  const rolePillStyle = {
    hosting:        "bg-orange-500/15 text-orange-600 border-orange-400/30",
    joined:         "bg-emerald-600/15 text-emerald-700 border-emerald-500/30",
    requested:      "bg-yellow-400/15 text-yellow-700 border-yellow-400/30",
    court_secured:  "bg-emerald-600/15 text-emerald-700 border-emerald-500/30",
  };

  const rolePillLabel = {
    hosting:        "Host",
    joined:         "Joined",
    requested:      "Requested",
    court_secured:  "Court Secured",
  };

  // Joined / Requested / Court Secured pill shown top-right (above price)
  const showTopRightPill = userStatus === "joined" || userStatus === "requested" || userStatus === "court_secured";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Link to={`/games/${id}`} className={`block card-game group overflow-hidden ${roleAccent}`}>
        <div className="p-3 sm:p-4 space-y-2">

          {/* Row 1: Title + Available/Taken badge + Skill chip */}
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
              {showTopRightPill && userStatus && (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold shrink-0 ${rolePillStyle[userStatus as keyof typeof rolePillStyle]}`}>
                  {rolePillLabel[userStatus as keyof typeof rolePillLabel]}
                </span>
              )}
            </div>
            {!isCourtSharing && (
              <span className={`badge-skill text-sm sm:text-base px-2.5 sm:px-3 py-1 font-black shrink-0 ${getSkillColor(skillLevel)}`}>
                {["D","C","B","A"][skillLevel - 1] ?? skillLevel}
              </span>
            )}
          </div>

          {/* Row 2: Location + distance */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
            <span className="truncate">{location}</span>
            {distance !== undefined && (
              <span className="text-primary/80 font-medium whitespace-nowrap shrink-0">· {formatDistance(distance)}</span>
            )}
          </div>

          {/* Row 3: Time range pill + Price */}
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-xs font-semibold ${urgencyPill}`}>
              <Clock className="w-3 h-3" />
              {formatTimeRange(dateTime, endDateTime)}
            </span>
            {showPrice && (
              <span className="text-primary font-bold text-xs sm:text-sm">
                {pricePerPlayer} Kč
              </span>
            )}
          </div>

          {/* Row 4: Host + spots/interest */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">

            {/* Left: club+admin or personal host */}
            {clubName ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 rounded-lg shrink-0 border border-border/60">
                  <AvatarImage src={clubLogo} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                    {clubName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[11px] sm:text-xs font-semibold text-primary truncate leading-tight cursor-pointer hover:underline"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/clubs/${clubId}`; }}
                  >
                    {clubName}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-tight flex items-center gap-1">
                    <Avatar className="h-3.5 w-3.5 shrink-0">
                      <AvatarImage src={hostAvatar} />
                      <AvatarFallback className="bg-muted text-[6px] font-semibold">
                        {hostName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    by {hostName}
                  </span>
                </div>
                {userStatus === "hosting" && (
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold shrink-0 ${rolePillStyle.hosting}`}>
                    {rolePillLabel.hosting}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <Avatar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0">
                  <AvatarImage src={hostAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[8px] sm:text-[9px] font-semibold">
                    {hostName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{hostName}</span>
                {userStatus === "hosting" && (
                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold shrink-0 ${rolePillStyle.hosting}`}>
                    {rolePillLabel.hosting}
                  </span>
                )}
              </div>
            )}

            {/* Right: spots/interest + stacked pill+price */}
            <div className="flex items-end gap-2 shrink-0">
              {/* Spots / interest count */}
              <div className="flex items-center">
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
              </div>

            </div>

          </div>

        </div>
      </Link>
    </motion.div>
  );
}
