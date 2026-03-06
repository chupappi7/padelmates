import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link2, MessageCircle, Send, Search, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatLevelBadge } from "@/lib/levelUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

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
  clubName?: string;
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

export function ShareGameSheet({
  open, onOpenChange, gameId,
  gameSlug, gameLocation, gameDateTime, endDateTime, gameFormat,
  gameMaxPlayers, currentPlayersCount, hostName, clubName, skillLevel, minLevel, maxLevel, pricePerPlayer, paymentMode,
}: ShareGameSheetProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { friends } = useFriends();
  const [showFriends, setShowFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const joinPath = gameSlug || gameId;
  const shareUrl = `https://padelmates.app/join/${joinPath}`;

  const isCourtSharing = paymentMode === "court_sharing";
  const isSpotSelling = paymentMode === "spot_selling";
  const isAmericano = gameFormat === "americano" || gameFormat === "team_americano";

  const buildMessage = () => {
    const lines: string[] = [];

    // Personalized header
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

    const displayHost = clubName || (hostName ? hostName.split(" ")[0] : null);
    if (displayHost) lines.push(`👤 ${isCourtSharing ? "Listed by" : "Hosted by"} ${displayHost}`);
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

    // Spots info — personalized
    if (isCourtSharing) {
      // No player count for court sharing
    } else if (isSpotSelling && gameMaxPlayers) {
      const filled = currentPlayersCount ?? 0;
      const left = gameMaxPlayers - filled;
      lines.push(`🙋 ${left} spot${left !== 1 ? "s" : ""} to fill`);
    } else if (gameMaxPlayers) {
      const filled = currentPlayersCount ?? 0;
      const left = gameMaxPlayers - filled;
      lines.push(`👥 ${filled}/${gameMaxPlayers} players · ${left} spot${left !== 1 ? "s" : ""} left`);
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

  const handleCopyText = () => {
    navigator.clipboard.writeText(message);
    toast.success("Message copied!");
  };

  const handleCopyLinkOnly = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
  };

  const handleWhatsApp = () => {
    const msg = buildMessage();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
    onOpenChange(false);
  };

  const handleSendToFriend = async (friendUserId: string) => {
    if (!user || sentTo.has(friendUserId)) return;

    // Find or create chat
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .or(
        `and(user_1_id.eq.${user.id},user_2_id.eq.${friendUserId}),and(user_1_id.eq.${friendUserId},user_2_id.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle();

    let chatId = existing?.id;
    if (!chatId) {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({ user_1_id: user.id, user_2_id: friendUserId })
        .select("id")
        .single();
      chatId = newChat?.id;
    }

    if (!chatId) {
      toast.error("Failed to send");
      return;
    }

    // Send game link as message
    const msg = `[game:${gameId}]`;
    await supabase.from("chat_messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      message: msg,
    });

    setSentTo(prev => new Set(prev).add(friendUserId));
    toast.success("Sent!");
  };

  const filteredFriends = friends.filter((f) => {
    if (!friendSearch) return true;
    return f.profile.name.toLowerCase().includes(friendSearch.toLowerCase());
  });

  const handleClose = (val: boolean) => {
    if (!val) {
      setShowFriends(false);
      setFriendSearch("");
      setSentTo(new Set());
    }
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left text-base">
              {showFriends ? "Send to Friends" : "Share"}
            </SheetTitle>
          </SheetHeader>
        </div>

        {!showFriends ? (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4">
              <div className="bg-muted rounded-xl p-4 whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground/90">
                {message}
              </div>
            </div>

            <div className="px-5 pb-2 space-y-1">
              <button
                onClick={handleCopyLinkOnly}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Copy link</p>
                  <p className="text-xs text-muted-foreground">Copy invite URL only</p>
                </div>
              </button>

              <button
                onClick={handleCopyText}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Copy className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Copy full text</p>
                  <p className="text-xs text-muted-foreground">Copy entire invite message</p>
                </div>
              </button>

              {user && (
                <button
                  onClick={() => setShowFriends(true)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Send to friends</p>
                    <p className="text-xs text-muted-foreground">Share via in-app message</p>
                  </div>
                </button>
              )}

              {isMobile && (
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
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {filteredFriends.length > 0 ? (
              <div className="rounded-xl border border-border/60 overflow-hidden">
                {filteredFriends.map((f, idx) => {
                  const sent = sentTo.has(f.profile.user_id);
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                        idx < filteredFriends.length - 1 ? "border-b border-border/40" : ""
                      } ${sent ? "bg-success/5" : "hover:bg-accent/50"}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={f.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {f.profile.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate flex-1">{f.profile.name}</span>
                      {sent ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-success shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendToFriend(f.profile.user_id)}
                          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {friendSearch ? `No match for "${friendSearch}"` : "No friends added yet"}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="pb-6 safe-bottom" />
      </SheetContent>
    </Sheet>
  );
}
