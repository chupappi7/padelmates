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
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl px-5 py-5 relative">
      {/* Edit icon top-right */}
      {isSelf && onEditClick && (
        <button
          onClick={onEditClick}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="w-20 h-20 border-2 border-white/15">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-2xl bg-white/10 text-white font-semibold">
              {name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isSelf && onAvatarUpload && (
            <>
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-3 h-3" />
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

        {/* Right side: name, ID, level+PDR */}
        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-between">
          <div>
            {/* Name */}
            <p
              className="text-white text-[26px] font-bold truncate leading-none"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {name}
            </p>

            {/* ID tight under name */}
            {friendCode && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">ID</span>
                <code className="text-[11px] font-mono text-white/40 tracking-wider">{friendCode}</code>
                <button
                  onClick={handleCopyCode}
                  className="text-white/25 hover:text-white/50 transition-colors p-0.5"
                >
                  {copied ? <Check className="w-2.5 h-2.5 text-primary" /> : <Copy className="w-2.5 h-2.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Level + PDR at bottom, aligned with avatar bottom */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={isSelf ? onLevelBadgeClick : undefined}
              className={isSelf ? "cursor-pointer" : "cursor-default"}
              disabled={!isSelf}
            >
              <SkillBadge level={skillLevel} size="sm" />
            </button>
            <span className="text-white/15 text-sm">|</span>
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">PDR</span>
            <span
              className="text-[24px] leading-none font-extrabold text-white tracking-tight"
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
