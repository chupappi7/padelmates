import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getSkillLabel } from "@/components/games/SkillBadge";

interface ShareGameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameTitle: string;
  gameSlug?: string;
  gameLocation?: string;
  gameDateTime?: string;
  endDateTime?: string;
  gameFormat?: string;
  gameMaxPlayers?: number;
  currentPlayersCount?: number;
  hostName?: string;
  skillLevel?: number;
  pricePerPlayer?: number;
}

const formatLabel = (f: string) => {
  switch (f) {
    case "casual_match": return "Casual Match";
    case "americano": return "Americano";
    case "team_americano": return "Team Americano";
    default: return f;
  }
};

export function ShareGameSheet({
  open, onOpenChange, gameId,
  gameSlug, gameLocation, gameDateTime, endDateTime, gameFormat,
  gameMaxPlayers, currentPlayersCount, hostName, skillLevel, pricePerPlayer,
}: ShareGameSheetProps) {
  const joinPath = gameSlug || gameId;
  const shareUrl = `https://padelmates.app/join/${joinPath}`;

  const buildMessage = () => {
    const lines: string[] = [];

    lines.push("🎾 Join us for a padel match!");
    lines.push("");

    if (gameLocation) lines.push(`📍 ${gameLocation}`);

    if (gameDateTime) {
      const start = new Date(gameDateTime);
      const dateStr = format(start, "EEEE, d MMMM yyyy");
      const startTime = format(start, "HH:mm");
      lines.push(`📅 ${dateStr}`);

      if (endDateTime) {
        const endTime = format(new Date(endDateTime), "HH:mm");
        lines.push(`⏰ ${startTime} – ${endTime}`);
      } else {
        lines.push(`⏰ ${startTime}`);
      }
    }

    if (gameMaxPlayers) {
      const filled = currentPlayersCount ?? 0;
      const left = gameMaxPlayers - filled;
      lines.push(`👥 ${filled}/${gameMaxPlayers} players · ${left} spot${left !== 1 ? "s" : ""} left`);
    }

    if (gameFormat) lines.push(`🎯 ${formatLabel(gameFormat)}`);

    if (skillLevel) lines.push(`🏅 Level ${getSkillLabel(skillLevel)}`);

    if (pricePerPlayer && pricePerPlayer > 0) {
      lines.push(`💰 ${pricePerPlayer} Kč per player`);
    } else {
      lines.push(`💰 Free`);
    }

    lines.push("");
    lines.push(`👉 ${shareUrl}`);

    return lines.join("\n");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildMessage());
    toast.success("✅ Copied! Paste it in your WhatsApp group");
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const msg = buildMessage();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[50vh] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Share</SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-5 py-4 space-y-1">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Copy invite message</p>
              <p className="text-xs text-muted-foreground">Copy full invite to clipboard</p>
            </div>
          </button>

          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Share to WhatsApp</p>
              <p className="text-xs text-muted-foreground">Send match invite via WhatsApp</p>
            </div>
          </button>
        </div>

        <div className="pb-6 safe-bottom" />
      </SheetContent>
    </Sheet>
  );
}
