import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, Send, Search, ArrowLeft, Loader2, Check } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareGameSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  gameTitle: string;
}

export function ShareGameSheet({ open, onOpenChange, gameId, gameTitle }: ShareGameSheetProps) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [step, setStep] = useState<"options" | "friends">("options");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const gameUrl = `${window.location.origin}/games/${gameId}`;

  const filteredFriends = friends.filter((f) =>
    !search || f.profile.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameUrl);
    toast.success("Invite link copied!");
    onOpenChange(false);
  };

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSendToSelected = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);

    const message = `Check out this match: ${gameTitle}\n${gameUrl}`;
    let successCount = 0;

    for (const friendUserId of selected) {
      try {
        const { data: existingChat } = await supabase
          .from("chats")
          .select("id")
          .is("listing_id", null)
          .or(
            `and(user_1_id.eq.${user.id},user_2_id.eq.${friendUserId}),and(user_1_id.eq.${friendUserId},user_2_id.eq.${user.id})`
          )
          .maybeSingle();

        let chatId = existingChat?.id;

        if (!chatId) {
          const { data: newChat, error: chatError } = await supabase
            .from("chats")
            .insert({ user_1_id: user.id, user_2_id: friendUserId })
            .select("id")
            .single();
          if (chatError) throw chatError;
          chatId = newChat.id;
        }

        const { error: msgError } = await supabase
          .from("chat_messages")
          .insert({ chat_id: chatId, sender_id: user.id, message });
        if (msgError) throw msgError;

        successCount++;
      } catch {
        // continue with others
      }
    }

    if (successCount > 0) {
      toast.success(`Link sent to ${successCount} friend${successCount > 1 ? "s" : ""}!`);
    } else {
      toast.error("Failed to send link");
    }

    setSending(false);
    onOpenChange(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setStep("options");
      setSearch("");
      setSelected(new Set());
    }
    onOpenChange(value);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left text-base flex items-center gap-2">
              {step === "friends" && (
                <button onClick={() => { setStep("options"); setSelected(new Set()); }} className="p-1 -ml-1 hover:bg-accent rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {step === "options" ? "Share" : "Send to Friends"}
            </SheetTitle>
          </SheetHeader>
          {step === "friends" && selected.size > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {selected.size} selected
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "options" ? (
            <div className="space-y-1">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Copy Link</p>
                  <p className="text-xs text-muted-foreground">Copy invite link to clipboard</p>
                </div>
              </button>

              <button
                onClick={() => setStep("friends")}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Send to Friends</p>
                  <p className="text-xs text-muted-foreground">Share via direct message</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {friends.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No friends added yet</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No match for "{search}"</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  {filteredFriends.map((f, idx) => {
                    const isSelected = selected.has(f.profile.user_id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleSelect(f.profile.user_id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 transition-colors",
                          idx < filteredFriends.length - 1 && "border-b border-border/40",
                          isSelected ? "bg-primary/5" : "hover:bg-accent/50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={f.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {f.profile.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate flex-1 text-left">{f.profile.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Send button - only visible in friends step with selections */}
        {step === "friends" && selected.size > 0 && (
          <div className="px-5 pb-2">
            <Button
              onClick={handleSendToSelected}
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send to {selected.size} friend{selected.size > 1 ? "s" : ""}
            </Button>
          </div>
        )}

        <div className="pb-6 safe-bottom" />
      </SheetContent>
    </Sheet>
  );
}
