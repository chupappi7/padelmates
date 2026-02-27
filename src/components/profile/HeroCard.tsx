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
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl px-5 py-4 relative">
      {isSelf && onEditClick && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 h-6 px-1.5 text-white/40 hover:text-white hover:bg-white/10 z-10"
          onClick={onEditClick}
        >
          <Pencil className="w-3 h-3" />
        </Button>
      )}

      <div className="flex gap-4 items-center">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="w-14 h-14 border-2 border-white/15">
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

        {/* Name + ID + Level/PDR — tight stack */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-white text-base font-bold leading-none truncate"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {name}
          </h1>

          {friendCode && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">ID</span>
              <code className="text-[11px] font-mono text-white/50 tracking-wider">{friendCode}</code>
              <button
                onClick={handleCopyCode}
                className="text-white/30 hover:text-white/60 transition-colors p-0.5"
              >
                {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}

          <div className="mt-2">
            <button
              onClick={isSelf ? onLevelBadgeClick : undefined}
              className={isSelf ? "cursor-pointer" : "cursor-default"}
              disabled={!isSelf}
            >
              <div className="flex items-center gap-2">
                <SkillBadge level={skillLevel} size="sm" />
                <span className="text-white/20 text-[10px]">·</span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">PDR</span>
                <span
                  className="text-white font-bold text-sm tabular-nums leading-none"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {pdrRating != null ? pdrRating.toFixed(2) : "NR"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
