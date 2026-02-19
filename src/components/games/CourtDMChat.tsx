import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, MessageCircle, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface Chat {
  id: string;
  user_1_id: string;
  user_2_id: string;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profile?: Profile | null;
}

interface InterestedUser {
  user_id: string;
  interest_id: string;
  interest_status: string;
  name: string;
  avatar_url: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  chat_id?: string;
  hasMessaged?: boolean;
}

interface CourtDMChatProps {
  gameId: string;
  currentUserId: string;
  hostId: string;
  isHost: boolean;
  isCourtTaken: boolean;
  gameLocation: string;
  gameDateTime: string;
  /** For host: all interests. For user: their own interest status */
  myInterestStatus?: string | null;
  onConfirmBooking?: (interestId: string, userId: string) => void;
}

export function CourtDMChat({
  gameId,
  currentUserId,
  hostId,
  isHost,
  isCourtTaken,
  gameLocation,
  gameDateTime,
  myInterestStatus,
  onConfirmBooking,
}: CourtDMChatProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(isHost ? null : hostId);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interestedUsers, setInterestedUsers] = useState<InterestedUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [hostBankDetails, setHostBankDetails] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── FETCH HOST BANK DETAILS ──────────────────────────────────────────────
  useEffect(() => {
    if (!hostId) return;
    supabase
      .from("profiles")
      .select("bank_details")
      .eq("user_id", hostId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHostBankDetails((data as any).bank_details || null);
      });
  }, [hostId]);

  // ── HOST: load all interested users with chat previews ──────────────────
  useEffect(() => {
    if (!isHost) return;
    loadInterestedUsers();
  }, [isHost, gameId]);

  const loadInterestedUsers = async () => {
    setLoading(true);
    const { data: interests } = await supabase
      .from("interests")
      .select("id, user_id, status")
      .eq("listing_id", gameId)
      .order("created_at", { ascending: true });

    if (!interests || interests.length === 0) {
      setInterestedUsers([]);
      setLoading(false);
      return;
    }

    const userIds = interests.map((i) => i.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const profileMap: Record<string, Profile> = {};
    profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });

    // Load chats (host is always user_2)
    const { data: chats } = await supabase
      .from("chats")
      .select("id, user_1_id, user_2_id")
      .eq("listing_id", gameId);

    const chatByUser: Record<string, string> = {};
    chats?.forEach((c) => {
      const otherUser = c.user_1_id === hostId ? c.user_2_id : c.user_1_id;
      chatByUser[otherUser] = c.id;
    });

    const users: InterestedUser[] = [];
    for (const interest of interests) {
      const chatId = chatByUser[interest.user_id];
      let lastMessage: string | undefined;
      let lastMessageAt: string | undefined;
      let hasMessaged = false;

      if (chatId) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("message, created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (msgs && msgs.length > 0) {
          lastMessage = msgs[0].message;
          lastMessageAt = msgs[0].created_at;
          hasMessaged = true;
        }
      }

      users.push({
        user_id: interest.user_id,
        interest_id: interest.id,
        interest_status: interest.status,
        name: profileMap[interest.user_id]?.name || "Unknown",
        avatar_url: profileMap[interest.user_id]?.avatar_url || null,
        lastMessage,
        lastMessageAt,
        chat_id: chatId,
        hasMessaged,
      });
    }

    // Sort: confirmed first, then by last message time
    users.sort((a, b) => {
      if (a.interest_status === "confirmed") return -1;
      if (b.interest_status === "confirmed") return 1;
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    setInterestedUsers(users);
    setLoading(false);
  };

  // ── OPEN CONVERSATION ────────────────────────────────────────────────────
  const openConversation = async (otherUserId: string) => {
    setSelectedUserId(otherUserId);
    // Find or create chat
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("listing_id", gameId)
      .or(`and(user_1_id.eq.${currentUserId},user_2_id.eq.${otherUserId}),and(user_1_id.eq.${otherUserId},user_2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (existing) {
      setActiveChatId(existing.id);
    } else {
      const user1 = currentUserId < otherUserId ? currentUserId : otherUserId;
      const user2 = currentUserId < otherUserId ? otherUserId : currentUserId;
      const { data: created } = await supabase
        .from("chats")
        .insert({ listing_id: gameId, user_1_id: user1, user_2_id: user2 })
        .select("id")
        .single();
      if (created) setActiveChatId(created.id);
    }
  };

  // Non-host: auto-open chat with host on mount
  useEffect(() => {
    if (!isHost && hostId) {
      openConversation(hostId);
    }
  }, [isHost, hostId]);

  // ── PRE-FILL INTEREST TEMPLATE (non-host, first open) ───────────────────
  useEffect(() => {
    if (!isHost && activeChatId && messages.length === 0) {
      const template = `Hi! I'm interested in your court at ${gameLocation} on ${format(new Date(gameDateTime), "EEE, MMM d · h:mm a")}. Is it still available?`;
      setNewMessage((prev) => prev || template);
    }
  }, [activeChatId, messages.length, isHost]);

  // ── LOAD MESSAGES ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChatId) return;
    fetchMessages(activeChatId);

    const channel = supabase
      .channel(`chat-${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatId}` },
        () => fetchMessages(activeChatId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap: Record<string, Profile> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });
      setMessages(data.map((m) => ({ ...m, profile: profileMap[m.sender_id] || null })));
    }
  };

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !activeChatId || sendLoading) return;
    setSendLoading(true);
    await supabase.from("chat_messages").insert({
      chat_id: activeChatId,
      sender_id: currentUserId,
      message: newMessage.trim(),
    });
    setNewMessage("");
    fetchMessages(activeChatId);
    if (isHost) loadInterestedUsers();
    setSendLoading(false);
  };

  // ── SEND BANK DETAILS (host) ─────────────────────────────────────────────
  const handleSendBankDetails = async () => {
    if (!activeChatId) return;
    if (!hostBankDetails) {
      toast.error("Add your bank details in Profile → Payment Info first");
      return;
    }
    await supabase.from("chat_messages").insert({
      chat_id: activeChatId,
      sender_id: currentUserId,
      message: `💳 Payment Details:\n${hostBankDetails}`,
    });
    fetchMessages(activeChatId);
    if (isHost) loadInterestedUsers();
  };

  // ── CONTEXT HEADER ───────────────────────────────────────────────────────
  const ContextHeader = () => (
    <div className="px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="font-medium text-foreground">{gameLocation}</span>
        </div>
        <span className="text-muted-foreground/40">·</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{format(new Date(gameDateTime), "EEE, MMM d · h:mm a")}</span>
        </div>
      </div>
      {!isHost && (
        <div className="mt-1.5">
          {isCourtTaken ? (
            <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive bg-destructive/5">
              <AlertCircle className="w-2.5 h-2.5 mr-1" />
              Court Taken
            </Badge>
          ) : myInterestStatus === "confirmed" ? (
            <Badge variant="outline" className="text-[10px] h-5 border-success/30 text-success bg-success/5">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
              Booking Confirmed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 border-warning/30 text-warning bg-warning/5">
              <Clock className="w-2.5 h-2.5 mr-1" />
              Waiting for host confirmation
            </Badge>
          )}
        </div>
      )}
    </div>
  );

  // ── HOST INBOX ───────────────────────────────────────────────────────────
  if (isHost && !selectedUserId) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col flex-1">
        {/* Listing context */}
        <ContextHeader />

        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
        ) : interestedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No interest yet</p>
            <p className="text-xs opacity-70 mt-1">Users who tap "I'm Interested" will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-y-auto flex-1">
            {interestedUsers.map((u) => (
              <button
                key={u.user_id}
                onClick={() => openConversation(u.user_id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    {u.interest_status === "confirmed" && (
                      <Badge className="text-[9px] h-4 px-1.5 bg-success/10 text-success border-success/20 border shrink-0">
                        Confirmed
                      </Badge>
                    )}
                  </div>
                  {u.hasMessaged ? (
                    <p className="text-xs text-muted-foreground truncate">{u.lastMessage}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No message yet</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {u.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(u.lastMessageAt), "h:mm a")}
                    </span>
                  )}
                  {u.hasMessaged && u.interest_status !== "confirmed" && !isCourtTaken && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onConfirmBooking?.(u.interest_id, u.user_id); }}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Confirm →
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CONVERSATION VIEW ────────────────────────────────────────────────────
  const selectedUser = interestedUsers.find((u) => u.user_id === selectedUserId);
  const otherUserName = isHost
    ? selectedUser?.name || "User"
    : "Host";
  const selectedInterestStatus = selectedUser?.interest_status;
  const isTaken = isCourtTaken;
  const isConfirmed = selectedInterestStatus === "confirmed" || myInterestStatus === "confirmed";
  const inputDisabled = isTaken && !isConfirmed;

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden flex-1">
      {/* Conversation header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        {isHost && (
          <button
            onClick={() => { setSelectedUserId(null); setActiveChatId(null); setMessages([]); loadInterestedUsers(); }}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{otherUserName}</p>
        </div>
        {isHost && selectedUser && selectedInterestStatus !== "confirmed" && !isCourtTaken && (
          <Button
            size="sm"
            className="h-8 text-xs shrink-0"
            onClick={() => onConfirmBooking?.(selectedUser.interest_id, selectedUser.user_id)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirm Booking
          </Button>
        )}
        {isHost && selectedInterestStatus === "confirmed" && (
          <Badge className="text-[10px] bg-success/10 text-success border-success/20 border">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
            Confirmed
          </Badge>
        )}
      </div>

      {/* Listing context pill */}
      <ContextHeader />

      {/* Taken banner for non-confirmed users */}
      {isTaken && !isConfirmed && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-muted/60 border border-border text-center">
          <p className="text-xs text-muted-foreground font-medium">
            <AlertCircle className="inline w-3 h-3 mr-1 text-destructive" />
            This court has been taken. Further messaging is disabled.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!activeChatId ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm">Opening chat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs opacity-70 mt-1">Start the conversation about this court</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.sender_id === currentUserId && "flex-row-reverse")}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={msg.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {msg.profile?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[75%]", msg.sender_id === currentUserId && "text-right")}>
                <p className="text-[11px] text-muted-foreground mb-0.5">
                  <span className="font-medium">{msg.profile?.name}</span>
                  <span className="ml-1.5">{format(new Date(msg.created_at), "h:mm a")}</span>
                </p>
                <div className={cn(
                  "inline-block px-3 py-2 rounded-2xl text-sm",
                  msg.sender_id === currentUserId
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                )}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border space-y-2">
        {isHost && activeChatId && !inputDisabled && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 border-dashed"
            onClick={handleSendBankDetails}
          >
            <CreditCard className="w-3.5 h-3.5" />
            💳 Send Bank Details
          </Button>
        )}
        <div className="flex gap-2">
          <Input
            placeholder={inputDisabled ? "Court has been taken" : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="text-sm h-10"
            disabled={inputDisabled}
          />
          <Button onClick={handleSend} size="icon" className="h-10 w-10 shrink-0" disabled={inputDisabled || sendLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
