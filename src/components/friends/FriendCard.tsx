import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/games/SkillBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, X, UserPlus, MoreHorizontal, User, Swords, UserMinus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FriendCardProps {
  userId?: string;
  name: string;
  avatarUrl: string | null;
  skillLevel: number;
  pdrRating?: number | null;
  variant: "friend" | "incoming" | "outgoing" | "search";
  subtitle?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
  onAdd?: () => void;
  disabled?: boolean;
}

export function FriendCard({
  userId,
  name,
  avatarUrl,
  skillLevel,
  pdrRating,
  variant,
  subtitle,
  onAccept,
  onReject,
  onRemove,
  onAdd,
  disabled,
}: FriendCardProps) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (userId) navigate(`/user/${userId}`);
  };

  const pdrDisplay = pdrRating != null ? pdrRating.toFixed(2) : "NR";

  return (
    <div className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl hover:bg-muted/30 transition-colors">
      <button onClick={handleProfileClick} className="shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>

      <button onClick={handleProfileClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold truncate">{name}</p>
          <SkillBadge level={skillLevel} size="sm" />
          <span
            className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {pdrDisplay}
          </span>
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        {variant === "incoming" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={disabled}
              className="h-8 px-2.5 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="hero"
              onClick={onAccept}
              disabled={disabled}
              className="h-8 gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </Button>
          </>
        )}

        {variant === "outgoing" && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={disabled}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        )}

        {variant === "friend" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleProfileClick}>
                <User className="mr-2 h-3.5 w-3.5" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="mr-2 h-3.5 w-3.5" />
                Remove Friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {variant === "search" && (
          <Button
            size="sm"
            variant="hero"
            onClick={onAdd}
            disabled={disabled}
            className="h-8 gap-1 rounded-full px-4"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
