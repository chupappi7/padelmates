import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { Copy, Check, Camera, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface HeroCardProps {
  name: string;
  avatarUrl: string | null;
  skillLevel: number;
  friendCode: string | null;
  pdrRating: number | null;
  isSelf: boolean;
  onEditClick?: () => void;
  onAvatarUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLevelBadgeClick?: () => void;
}

export function HeroCard({
  name,
  avatarUrl,
  skillLevel,
  friendCode,
  pdrRating,
  isSelf,
  onEditClick,
  onAvatarUpload,
  onLevelBadgeClick,
}: HeroCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!friendCode) return;
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    toast.success("Friend code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl px-4 py-3 relative">
      {/* Edit / label top-right */}
      {isSelf && onEditClick ? (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 px-2 text-white/40 hover:text-white hover:bg-white/10"
          onClick={onEditClick}
        >
          <Pencil className="w-3 h-3 mr-1" />
          <span className="text-[10px]">Edit</span>
        </Button>
      ) : (
        <span
          className="absolute top-2.5 right-3 text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Player Profile
        </span>
      )}

      {/* Avatar + text stack */}
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0">
          <Avatar className="w-13 h-13 border-2 border-white/15">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-lg bg-white/10 text-white font-semibold">
              {name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isSelf && onAvatarUpload && (
            <>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-2.5 h-2.5" />
              </label>
              <Input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={onAvatarUpload}
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-white/80 text-[15px] font-medium truncate leading-none"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {name}
          </p>

          {/* ID directly under name */}
          {friendCode && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-white/30 uppercase tracking-wider">ID</span>
              <code className="text-[11px] font-mono text-white/45 tracking-wider">{friendCode}</code>
              <button
                onClick={handleCopyCode}
                className="text-white/30 hover:text-white/60 transition-colors p-0.5"
              >
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Level + PDR */}
          <div className="flex items-baseline gap-2 mt-1.5">
            <button
              onClick={isSelf ? onLevelBadgeClick : undefined}
              className={isSelf ? "cursor-pointer" : "cursor-default"}
              disabled={!isSelf}
            >
              <SkillBadge level={skillLevel} size="sm" />
            </button>
            <span className="text-white/15 text-xs">|</span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">PDR</span>
            <span
              className="text-[20px] leading-none font-extrabold text-white tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {pdrRating != null ? pdrRating.toFixed(2) : "NR"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
