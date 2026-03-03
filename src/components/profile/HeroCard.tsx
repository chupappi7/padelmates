import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SkillBadge } from "@/components/games/SkillBadge";
import { Copy, Check, Camera } from "lucide-react";
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
  onPdrClick?: () => void;
}

const SPACE = "'Space Grotesk', system-ui, sans-serif";

export function HeroCard({
  name,
  avatarUrl,
  skillLevel,
  friendCode,
  pdrRating,
  isSelf,
  onAvatarUpload,
  onLevelBadgeClick,
  onPdrClick,
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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background with brand teal gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(175 84% 28%) 0%, hsl(180 70% 32%) 40%, hsl(190 75% 38%) 100%)",
        }}
      />
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Glow accent */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.07] blur-2xl" />

      <div className="relative px-6 pt-6 pb-5">
        {/* Top row: Avatar + Info */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="w-[72px] h-[72px] ring-2 ring-white/20 ring-offset-2 ring-offset-transparent">
              <AvatarImage src={avatarUrl || undefined} className="object-cover" />
              <AvatarFallback
                className="text-xl font-bold"
                style={{
                  background: "hsl(175 60% 22%)",
                  color: "hsl(175 80% 80%)",
                  fontFamily: SPACE,
                }}
              >
                {name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isSelf && onAvatarUpload && (
              <>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    background: "hsl(175 84% 32%)",
                    color: "white",
                    boxShadow: "0 2px 8px hsl(175 84% 32% / 0.5)",
                  }}
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

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <p
              className="text-white text-[22px] font-bold truncate leading-tight"
              style={{ fontFamily: SPACE }}
            >
              {name}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={isSelf ? onLevelBadgeClick : undefined}
                className={isSelf ? "cursor-pointer" : "cursor-default"}
                disabled={!isSelf}
              >
                <SkillBadge level={skillLevel} size="sm" />
              </button>

              {friendCode && (
                <>
                  <span className="text-white/20 text-xs">·</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 group"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-white/70" />
                    ) : (
                      <Copy className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                    )}
                    <span
                      className={`text-[11px] font-mono tracking-wider ${
                        copied ? "text-white/70" : "text-white/40 group-hover:text-white/60"
                      } transition-colors`}
                    >
                      {friendCode}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PDR Rating strip */}
        <button
          onClick={onPdrClick}
          className="mt-4 w-full flex items-center justify-between rounded-xl px-4 py-2.5 transition-colors"
          style={{
            background: "hsl(175 60% 22% / 0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase"
              style={{
                background: "hsl(175 80% 45% / 0.3)",
                color: "hsl(175 80% 80%)",
                fontFamily: SPACE,
              }}
            >
              PDR
            </div>
            <span className="text-[11px] text-white/50 font-medium uppercase tracking-wider">
              Rating
            </span>
          </div>
          <span
            className="text-[28px] font-extrabold text-white tracking-tight leading-none"
            style={{ fontFamily: SPACE }}
          >
            {pdrRating != null ? pdrRating.toFixed(2) : "NR"}
          </span>
        </button>
      </div>
    </div>
  );
}
