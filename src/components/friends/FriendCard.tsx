import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/games/SkillBadge";
import { Check, X, UserPlus, UserMinus } from "lucide-react";

interface FriendCardProps {
  userId?: string;
  name: string;
  avatarUrl: string | null;
  skillLevel: number;
  variant: "friend" | "incoming" | "outgoing" | "search";
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
  variant,
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

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
      <button onClick={handleProfileClick} className="shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>
      <button onClick={handleProfileClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate hover:underline">{name}</p>
          <SkillBadge level={skillLevel} size="sm" />
        </div>
      </button>
      <div className="flex items-center gap-2">
        {variant === "incoming" && (
          <>
            <Button size="sm" variant="outline" onClick={onReject} disabled={disabled} className="h-8 px-2.5">
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="hero" onClick={onAccept} disabled={disabled} className="h-8">
              <Check className="w-3.5 h-3.5 mr-1" />
              Accept
            </Button>
          </>
        )}
        {variant === "outgoing" && (
          <Button size="sm" variant="outline" onClick={onReject} disabled={disabled} className="h-8 text-xs">
            Cancel
          </Button>
        )}
        {variant === "friend" && (
          <Button size="sm" variant="outline" onClick={onRemove} disabled={disabled} className="h-8 px-2.5">
            <UserMinus className="w-3.5 h-3.5" />
          </Button>
        )}
        {variant === "search" && (
          <Button size="sm" variant="hero" onClick={onAdd} disabled={disabled} className="h-8">
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}
