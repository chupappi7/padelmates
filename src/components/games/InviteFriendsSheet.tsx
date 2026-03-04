import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InviteFriendsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  onDone: () => void;
}

export function InviteFriendsSheet({ open, onOpenChange, gameId, onDone }: InviteFriendsSheetProps) {
  const { user } = useAuth();
  const { friends, loading } = useFriends();
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const handleSend = async (friendUserId: string) => {
    if (!user || sentTo.has(friendUserId)) return;

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

    await supabase.from("chat_messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      message: `[game:${gameId}]`,
    });

    setSentTo((prev) => new Set(prev).add(friendUserId));
    toast.success("Sent!");
  };

  const filtered = friends.filter((f) =>
    !search || f.profile.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = (val: boolean) => {
    if (!val) onDone();
    onOpenChange(val);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] flex flex-col p-0">
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <SheetHeader>
            <SheetTitle className="text-left text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Invite Friends
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : filtered.length > 0 ? (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              {filtered.map((f, idx) => {
                const sent = sentTo.has(f.profile.user_id);
                return (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      idx < filtered.length - 1 ? "border-b border-border/40" : ""
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
                        onClick={() => handleSend(f.profile.user_id)}
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
                {search ? `No match for "${search}"` : "No friends added yet"}
              </p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-border/50 safe-bottom">
          <Button variant="ghost" className="w-full" onClick={onDone}>
            {sentTo.size > 0 ? "Done" : "Skip"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
