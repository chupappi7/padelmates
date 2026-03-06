import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatLevelBadge } from "@/lib/levelUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface ShareTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  gameId: string;
  gameSlug?: string;
  location: string;
  dateTime: string;
  endDateTime?: string;
  gameFormat: string;
  maxPlayers: number;
  hostName: string;
  skillLevel?: number;
  minLevel?: string | null;
  maxLevel?: string | null;
  pricePerPlayer?: number;
  paymentMode?: string;
}

const formatLabel = (f: string) => {
  switch (f) {
    case "casual_match": return "Casual Match";
    case "americano": return "Americano";
    case "team_americano": return "Team Americano";
    default: return f;
  }
};

export function ShareTemplateSheet({
  open, onOpenChange, onDone,
  gameId, gameSlug, location, dateTime, endDateTime,
  gameFormat, maxPlayers, hostName, skillLevel,
  minLevel, maxLevel, pricePerPlayer, paymentMode,
}: ShareTemplateSheetProps) {
  const isMobile = useIsMobile();

  const joinPath = gameSlug || gameId;
  const shareUrl = `https://padelmates.app/join/${joinPath}`;

  const isCourtSharing = paymentMode === "court_sharing";
  const isSpotSelling = paymentMode === "spot_selling";
  const isAmericano = gameFormat === "americano" || gameFormat === "team_americano";

  const buildMessage = () => {
    const lines: string[] = [];

    if (isCourtSharing) {
      lines.push("🏟️ Court available for padel!");
    } else if (isSpotSelling) {
      lines.push("🔄 Looking for a backup player!");
    } else if (isAmericano) {
      lines.push(`🏆 Join our ${gameFormat === "team_americano" ? "Team " : ""}Americano tournament!`);
    } else {
      lines.push("🎾 Join us for a padel match!");
    }
    lines.push("");

    const displayHost = hostName ? hostName.split(" ")[0] : null;
    if (displayHost) lines.push(`👤 ${isCourtSharing ? "Listed by" : "Hosted by"} ${displayHost}`);
    lines.push("");

    if (location) lines.push(`📍 ${location}`);

    if (dateTime) {
      const start = new Date(dateTime);
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

    if (isCourtSharing) {
      // no player count
    } else if (isSpotSelling) {
      lines.push(`🙋 1 spot to fill`);
    } else if (maxPlayers) {
      lines.push(`👥 ${maxPlayers} spots`);
    }

    if (!isSpotSelling && gameFormat) lines.push(`🎯 ${formatLabel(gameFormat)}`);

    if (!isSpotSelling) {
      const levelLabel = formatLevelBadge(minLevel, maxLevel, skillLevel);
      if (levelLabel && levelLabel !== "?") lines.push(`🏅 Level ${levelLabel}`);
    }

    if (pricePerPlayer && pricePerPlayer > 0) {
      if (isCourtSharing) {
        lines.push(`💰 ${pricePerPlayer} Kč for the court`);
      } else {
        lines.push(`💰 ${pricePerPlayer} Kč per player`);
      }
    }

    lines.push("");
    lines.push(`👉 ${shareUrl}`);

    return lines.join("\n");
  };

  const message = buildMessage();

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast.success("Copied to clipboard!");
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleClose = (val: boolean) => {
    if (!val) onDone();
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left text-base">Share your game</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground/90">
            {message}
          </div>
        </div>

        <div className="px-5 pb-3 pt-2 border-t border-border/50 space-y-2">
          <div className={`flex gap-2 ${isMobile ? "" : ""}`}>
            <Button onClick={handleCopy} variant="outline" className={`h-11 ${isMobile ? "flex-1" : "w-full"}`}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            {isMobile && (
              <Button
                onClick={handleWhatsApp}
                className="flex-1 h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>
          <Button variant="ghost" className="w-full" onClick={onDone}>
            Skip
          </Button>
        </div>
        <div className="safe-bottom" />
      </SheetContent>
    </Sheet>
  );
}
