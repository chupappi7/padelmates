import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShareGameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameTitle: string;
  gameSlug?: string;
  gameLocation?: string;
  gameDateTime?: string;
  gameFormat?: string;
  gameMaxPlayers?: number;
  currentPlayersCount?: number;
  hostName?: string;
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
  gameSlug, gameLocation, gameDateTime, gameFormat,
  gameMaxPlayers, currentPlayersCount, hostName,
}: ShareGameSheetProps) {
  const joinPath = gameSlug || gameId;
  const gameUrl = `https://padelmates.app/join/${joinPath}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameUrl);
    toast.success("Link copied to clipboard!");
    onOpenChange(false);
  };

  const handleWhatsApp = () => {
    const dateStr = gameDateTime
      ? format(new Date(gameDateTime), "EEE d MMM · HH:mm")
      : "";
    const spotsLeft = gameMaxPlayers && currentPlayersCount !== undefined
      ? gameMaxPlayers - currentPlayersCount
      : null;

    let msg = `🎾 ${hostName || "Someone"} invited you to a padel match!\n\n`;
    if (gameLocation) msg += `📍 ${gameLocation}\n`;
    if (dateStr) msg += `🗓 ${dateStr}\n`;
    if (spotsLeft !== null) msg += `👥 ${spotsLeft} spots left\n`;
    if (gameFormat) msg += `🎯 ${formatLabel(gameFormat)}\n`;
    msg += `\nJoin here: ${gameUrl}`;

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
              <p className="text-sm font-medium">Copy invite link</p>
              <p className="text-xs text-muted-foreground">Copy link to clipboard</p>
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
