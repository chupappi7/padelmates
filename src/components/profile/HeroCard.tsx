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
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl p-6 relative">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column (4 cols) — Avatar */}
        <div className="col-span-4 flex items-start justify-center pt-0.5">
          <div className="flex flex-col items-center gap-0">
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-white/15">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xl bg-white/10 text-white font-semibold">
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
          </div>
        </div>

        {/* Middle Column (6 cols) — Name, ID, Level+PDR */}
        <div className="col-span-6 flex flex-col justify-center min-w-0">
          {/* Row 1: Name */}
          <h1
            className="text-white text-[17px] font-bold leading-tight truncate"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {name}
          </h1>

          {/* Row 2: ID — 8px below name */}
          {friendCode && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">ID</span>
              <code className="text-[11px] font-mono text-white/50 tracking-wider">
                {friendCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="text-white/30 hover:text-white/60 transition-colors p-0.5"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-primary" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {/* Row 3: Level badge + PDR — 16px below ID */}
          <div className="mt-4">
            <button
              onClick={isSelf ? onLevelBadgeClick : undefined}
              className={isSelf ? "cursor-pointer" : "cursor-default"}
              disabled={!isSelf}
            >
              <div className="flex items-center gap-2.5">
                <SkillBadge level={skillLevel} size="sm" />
                <span className="text-white/25 text-xs">·</span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">PDR</span>
                <span
                  className="text-white font-bold text-[15px] tabular-nums leading-none"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {pdrRating != null ? pdrRating.toFixed(2) : "NR"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column (2 cols) — Edit */}
        <div className="col-span-2 flex justify-end items-start">
          {isSelf && onEditClick && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white/50 hover:text-white hover:bg-white/10"
              onClick={onEditClick}
            >
              <Pencil className="w-3 h-3 mr-1" />
              <span className="text-[10px]">Edit</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
