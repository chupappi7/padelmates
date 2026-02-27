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
  stats: {
    matches: number;
    wins: number;
    losses: number;
    winRate: number;
  };
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
  stats,
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
    <div className="bg-gradient-to-br from-[#0D2137] via-[#142D4A] to-[#1A4060] rounded-2xl px-5 pt-4 pb-5 relative">
      {/* Edit button - self only */}
      {isSelf && onEditClick && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 h-7 px-2 text-white/50 hover:text-white hover:bg-white/10 z-10"
          onClick={onEditClick}
        >
          <Pencil className="w-3 h-3 mr-1" />
          <span className="text-[10px]">Edit</span>
        </Button>
      )}

      <div className="flex gap-5">
        {/* Left: Avatar + Level Badge */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative">
            <Avatar className="w-[72px] h-[72px] border-2 border-white/15">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-white/10 text-white font-semibold">
                {name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isSelf && onAvatarUpload && (
              <>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
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
          <button
            onClick={isSelf ? onLevelBadgeClick : undefined}
            className={isSelf ? "cursor-pointer" : "cursor-default"}
            disabled={!isSelf}
          >
            <SkillBadge level={skillLevel} size="sm" />
          </button>
        </div>

        {/* Center: Name + ID */}
        <div className="flex-1 min-w-0 pt-1">
          <h1
            className="text-white text-lg font-bold leading-tight truncate"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            {name}
          </h1>

          {friendCode && (
            <div className="flex items-center gap-1.5 mt-1">
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

          {/* Right-aligned stats stack (inside center for layout) */}
          <div className="mt-3">
            <div className="grid grid-cols-4 gap-0">
              {[
                { value: stats.matches, label: "Matches" },
                { value: stats.wins, label: "Wins" },
                { value: stats.losses, label: "Losses" },
                { value: `${stats.winRate}%`, label: "Win %" },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="text-white font-bold text-base tabular-nums leading-none"
                    style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-white/35 text-[9px] mt-1 uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
