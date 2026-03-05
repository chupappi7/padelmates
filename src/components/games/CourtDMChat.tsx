import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, MessageCircle, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, CreditCard, Copy, Check, ImagePlus } from "lucide-react";

import { ChatImageMessage } from "@/components/chat/ChatImageMessage";
import { toast } from "sonner";

function formatLastMessage(msg?: string): string {
  if (!msg) return "";
  if (msg.startsWith("[image]")) return "📷 Photo";
  if (msg.startsWith("📸 image:")) return "📷 Photo";
  if (msg.startsWith("[game:")) return "🎾 Shared a match";
  if (msg.startsWith("💳 Payment Details")) return "💳 Bank details";
  return msg;
}

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
  unreadCount?: number;
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

// ── STAGE DETECTION ──────────────────────────────────────────────────────────
type ChatStage = "availability" | "price" | "payment_request" | "payment_sent" | "confirmed";
type QuickChip = { label: string; message: string; variant?: "destructive" | "default" };

function detectStage(
  messages: ChatMessage[],
  interestStatus: string | undefined | null,
  hostId: string
): ChatStage {
  if (interestStatus === "confirmed") return "confirmed";
  if (messages.length === 0) return "availability";

  const lastMsgs = messages.slice(-6);
  const hasPaymentDetails = lastMsgs.some((m) => m.message.includes("💳 Payment Details"));
  const hasPaymentSent = lastMsgs.some((m) => m.message.toLowerCase().includes("payment sent"));
  const hasAvailable = lastMsgs.some(
    (m) => m.sender_id === hostId && m.message.toLowerCase().includes("available")
  );
  const hasPriceQuery = lastMsgs.some(
    (m) => m.sender_id !== hostId && (m.message.toLowerCase().includes("price") || m.message.toLowerCase().includes("take it") || m.message.toLowerCase().includes("negotiable"))
  );

  if (hasPaymentDetails) return "payment_sent";
  if (hasPriceQuery || hasAvailable) return "payment_request";
  // messages exist but none of the above — buyer sent intro, host hasn't replied with "available"
  return "price";
}

// ── IMAGE BUBBLE ─────────────────────────────────────────────────────────────
function ImageBubble({ filePath, isMine, senderName, createdAt }: {
  filePath: string;
  isMine: boolean;
  senderName?: string;
  createdAt: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from("payment-screenshots").createSignedUrl(filePath, 3600).then(({ data }) => {
      if (data) setImgUrl(data.signedUrl);
    });
  }, [filePath]);

  return (
    <div className={cn("max-w-[75%]", isMine && "text-right")}>
      <p className="text-[11px] text-muted-foreground mb-0.5">
        <span className="font-medium">{senderName}</span>
        <span className="ml-1.5">{format(new Date(createdAt), "HH:mm")}</span>
      </p>
      <div className={cn(
        "rounded-2xl overflow-hidden border",
        isMine ? "rounded-tr-sm border-primary/20" : "rounded-tl-sm border-border"
      )}>
        {imgUrl ? (
          <a href={imgUrl} target="_blank" rel="noopener noreferrer">
            <img src={imgUrl} alt="Screenshot" className="max-w-[220px] max-h-[280px] object-cover" />
          </a>
        ) : (
          <div className="w-40 h-24 bg-muted flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-muted-foreground opacity-40" />
          </div>
        )}
      </div>
    </div>
  );
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hostBankDetails, setHostBankDetails] = useState<string | null>(null);
  const [hostBankQrUrl, setHostBankQrUrl] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Current chat's interest status (for stage detection)
  const selectedUser = interestedUsers.find((u) => u.user_id === selectedUserId);
  const currentInterestStatus = isHost ? selectedUser?.interest_status : myInterestStatus;
  const stage = detectStage(messages, currentInterestStatus, hostId);

  // ── FETCH HOST BANK DETAILS ──────────────────────────────────────────────
  useEffect(() => {
    if (!hostId) return;
    supabase
      .from("profiles")
      .select("bank_details, bank_qr_url")
      .eq("user_id", hostId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHostBankDetails((data as any).bank_details || null);
          setHostBankQrUrl((data as any).bank_qr_url || null);
        }
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
      let unreadCount = 0;

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

        // Count unread messages (from the other user, not host)
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("chat_id", chatId)
          .neq("sender_id", currentUserId);
        // Simple heuristic: all messages from other user are "unread" if no read tracking per-thread
        // We use conversation_preferences last_read_at if available
        const { data: prefData } = await supabase
          .from("conversation_preferences")
          .select("last_read_at")
          .eq("user_id", currentUserId)
          .eq("conversation_id", chatId)
          .maybeSingle();
        
        if (prefData?.last_read_at) {
          const { count: unread } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_id", chatId)
            .neq("sender_id", currentUserId)
            .gt("created_at", prefData.last_read_at);
          unreadCount = unread || 0;
        } else {
          // No read marker = all messages from others are unread
          unreadCount = count || 0;
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
        unreadCount,
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

    let chatId: string | null = null;
    if (existing) {
      chatId = existing.id;
      setActiveChatId(existing.id);
    } else {
      const user1 = currentUserId < otherUserId ? currentUserId : otherUserId;
      const user2 = currentUserId < otherUserId ? otherUserId : currentUserId;
      const { data: created } = await supabase
        .from("chats")
        .insert({ listing_id: gameId, user_1_id: user1, user_2_id: user2 })
        .select("id")
        .single();
      if (created) {
        chatId = created.id;
        setActiveChatId(created.id);
      }
    }

    // Mark as read
    if (chatId) {
      const now = new Date().toISOString();
      const { data: existingPref } = await supabase
        .from("conversation_preferences")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("conversation_id", chatId)
        .maybeSingle();
      if (existingPref) {
        await supabase.from("conversation_preferences").update({ last_read_at: now }).eq("id", existingPref.id);
      } else {
        await supabase.from("conversation_preferences").insert({ user_id: currentUserId, conversation_id: chatId, last_read_at: now });
      }
      // Clear unread count locally
      setInterestedUsers(prev => prev.map(u => u.user_id === otherUserId ? { ...u, unreadCount: 0 } : u));
    }
  };

  // Non-host: auto-open chat with host on mount
  useEffect(() => {
    if (!isHost && hostId) {
      openConversation(hostId);
    }
  }, [isHost, hostId]);

  // ── PRE-FILL INTEREST TEMPLATE (non-host, on button click) ─────────────
  const handlePrefillInterest = () => {
    const template = `Hi! I'm interested in your court at ${gameLocation} on ${format(new Date(gameDateTime), "EEE, MMM d · HH:mm")}. Is it still available?`;
    setNewMessage(template);
  };

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

  // ── SEND QUICK REPLY ─────────────────────────────────────────────────────
  const sendQuickReply = async (message: string) => {
    if (!activeChatId || sendLoading) return;
    setSendLoading(true);
    await supabase.from("chat_messages").insert({
      chat_id: activeChatId,
      sender_id: currentUserId,
      message,
    });
    fetchMessages(activeChatId);
    if (isHost) loadInterestedUsers();
    setSendLoading(false);
  };

  // ── SEND BANK DETAILS (host) ─────────────────────────────────────────────
  const handleSendBankDetails = async () => {
    if (!activeChatId) return;
    if (!hostBankDetails && !hostBankQrUrl) {
      toast.error("Add your bank details or QR code in Profile → Payment Info first");
      return;
    }
    setSendLoading(true);

    // Send text bank details if available
    if (hostBankDetails) {
      await supabase.from("chat_messages").insert({
        chat_id: activeChatId,
        sender_id: currentUserId,
        message: `💳 Payment Details:\n${hostBankDetails}`,
      });
    }

    // Send QR code image if available
    if (hostBankQrUrl) {
      await supabase.from("chat_messages").insert({
        chat_id: activeChatId,
        sender_id: currentUserId,
        message: `[image]${hostBankQrUrl}`,
      });
    }

    fetchMessages(activeChatId);
    if (isHost) loadInterestedUsers();
    setSendLoading(false);
  };

  // ── COPY TEXT ────────────────────────────────────────────────────────────
  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // ── UPLOAD IMAGE ─────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    setUploadingImage(true);
    const fileName = `chat/${activeChatId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload image");
      setUploadingImage(false);
      return;
    }

    // Send a special image message with the file path
    await supabase.from("chat_messages").insert({
      chat_id: activeChatId,
      sender_id: currentUserId,
      message: `📸 image:${fileName}`,
    });
    fetchMessages(activeChatId);
    if (isHost) loadInterestedUsers();
    setUploadingImage(false);
    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ── QUICK REPLY CHIPS ────────────────────────────────────────────────────
  const getQuickReplies = (): QuickChip[] => {
    if (stage === "confirmed" || isCourtTaken) return [];

    if (isHost) {
      if (stage === "availability" || stage === "price") {
        // Host sees buyer's interest message — offer availability chips
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.sender_id === currentUserId) return [];
        return [
          { label: "✅ Yes, still available!", message: "Yes, it's still available! 🎾" },
          { label: "❌ Sorry, it's taken", message: "Sorry, the court has been taken 😔", variant: "destructive" },
        ];
      }
      if (stage === "payment_sent") {
        // Buyer has confirmed payment — prompt host to confirm booking
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.sender_id === currentUserId) return [];
        return [
          { label: "✅ Payment received! Booking confirmed", message: "Payment received! ✅ Your booking is confirmed. See you on the court! 🎾" },
        ];
      }
      return [];
    }

    // Buyer side
    if (stage === "price") {
      // Host confirmed availability — buyer asks about price
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.sender_id === currentUserId) return [];
      return [
        { label: "💰 What's the price?", message: "Great! What's the price per person?" },
        { label: "🤝 Is it negotiable?", message: "Awesome! Is the price negotiable?" },
        { label: "🎾 I'll take it!", message: "Great, I'll take it at the listed price! How do I pay?" },
      ];
    }
    if (stage === "payment_request") {
      // Host discussed price — suggest asking for payment details
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.sender_id === currentUserId) return [];
      return [
        { label: "💳 Send me payment details", message: "Sounds good! Please send me the payment details." },
      ];
    }
    if (stage === "payment_sent") {
      return [];
    }
    // payment_request stage where bank details were sent
    return [];
  };

  // After bank details are sent, buyer gets payment confirmation chips
  const getBuyerPaymentChips = (): QuickChip[] => {
    if (isHost || stage !== "payment_sent") return [];
    const lastMsg = messages[messages.length - 1];
    // Only show if last message is from host (bank details)
    if (!lastMsg || lastMsg.sender_id === currentUserId) return [];
    return [
      { label: "✅ Payment sent!", message: "I've sent the payment! ✅ Please check and confirm." },
      { label: "📸 I'll send a screenshot", message: "I'll send a screenshot of my transfer as proof." },
    ];
  };

  const quickReplies = getQuickReplies();
  const buyerPaymentChips = getBuyerPaymentChips();
  const allChips = [...quickReplies, ...buyerPaymentChips];

  // ── STATUS BADGE (compact, inline) ──────────────────────────────────────
  const statusBadge = !isHost ? (
    isCourtTaken ? (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-destructive/30 text-destructive bg-destructive/5 shrink-0">
        <AlertCircle className="w-2.5 h-2.5 mr-0.5" />Taken
      </Badge>
    ) : myInterestStatus === "confirmed" ? (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-success/30 text-success bg-success/5 shrink-0">
        <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Confirmed
      </Badge>
    ) : (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-warning/30 text-warning bg-warning/5 shrink-0">
        <Clock className="w-2.5 h-2.5 mr-0.5" />Pending
      </Badge>
    )
  ) : null;

  // ── HOST INBOX ───────────────────────────────────────────────────────────
  if (isHost && !selectedUserId) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col flex-1">
        {/* Compact context bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20 text-[11px] text-muted-foreground overflow-x-auto no-scrollbar">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="font-medium text-foreground truncate">{gameLocation}</span>
          <span className="opacity-40">·</span>
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">{format(new Date(gameDateTime), "MMM d · HH:mm")}</span>
        </div>

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
            {interestedUsers.map((u) => {
              const hasUnread = (u.unreadCount || 0) > 0;
              return (
              <button
                key={u.user_id}
                onClick={() => openConversation(u.user_id)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left",
                  hasUnread && "bg-muted/30"
                )}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={cn(
                      "text-sm truncate",
                      hasUnread ? "font-bold" : "font-semibold"
                    )}>{u.name}</p>
                    {u.interest_status === "confirmed" && (
                      <Badge className="text-[9px] h-4 px-1.5 bg-success/10 text-success border-success/20 border shrink-0">
                        Confirmed
                      </Badge>
                    )}
                  </div>
                  {u.hasMessaged ? (
                    <p className={cn(
                      "text-xs truncate",
                      hasUnread ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>{formatLastMessage(u.lastMessage)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No message yet</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {u.lastMessageAt && (
                    <span className={cn(
                      "text-[10px]",
                      hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      {format(new Date(u.lastMessageAt), "HH:mm")}
                    </span>
                  )}
                  {hasUnread && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                      {u.unreadCount! > 9 ? "9+" : u.unreadCount}
                    </span>
                  )}
                  {!hasUnread && u.hasMessaged && u.interest_status !== "confirmed" && !isCourtTaken && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onConfirmBooking?.(u.interest_id, u.user_id); }}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Confirm →
                    </button>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── CONVERSATION VIEW ────────────────────────────────────────────────────
  const otherUserName = isHost
    ? selectedUser?.name || "User"
    : "Host";
  const selectedInterestStatus = selectedUser?.interest_status;
  const isTaken = isCourtTaken;
  const isConfirmed = selectedInterestStatus === "confirmed" || myInterestStatus === "confirmed";
  const inputDisabled = isTaken && !isConfirmed;

  // ── MESSAGE BUBBLE RENDERER ──────────────────────────────────────────────
  const renderBubble = (msg: ChatMessage) => {
    const isMine = msg.sender_id === currentUserId;
    const isBankDetails = msg.message.startsWith("💳 Payment Details");
    const isImageMsg = msg.message.startsWith("📸 image:");
    const isChatImage = msg.message.startsWith("[image]");
    const isPaymentSent = msg.message.toLowerCase().includes("payment sent") || msg.message.toLowerCase().includes("i've sent the payment");
    const isTakenMsg = msg.message.toLowerCase().includes("court has been taken") || msg.message.toLowerCase().includes("sorry, the court");

    if (isBankDetails) {
      const details = msg.message.replace("💳 Payment Details:\n", "");
      return (
        <div className="max-w-[80%]">
          <p className="text-[10px] text-muted-foreground mb-0.5">
            <span className="font-medium">{msg.profile?.name}</span>
            <span className="ml-1">{format(new Date(msg.created_at), "HH:mm")}</span>
          </p>
          <div className="rounded-xl rounded-tl-sm border border-warning/40 bg-warning/5 px-3 py-2 flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-foreground truncate">{details}</p>
            </div>
            <button
              onClick={() => handleCopy(details, msg.id)}
              className="flex items-center gap-0.5 text-[10px] text-warning hover:text-warning/70 transition-colors shrink-0"
            >
              {copiedMsgId === msg.id ? (
                <><Check className="w-3 h-3" /> Copied</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
        </div>
      );
    }

    if (isImageMsg) {
      const filePath = msg.message.replace("📸 image:", "");
      return (
        <ImageBubble
          key={msg.id}
          filePath={filePath}
          isMine={isMine}
          senderName={msg.profile?.name}
          createdAt={msg.created_at}
        />
      );
    }

    if (isChatImage) {
      const src = msg.message.replace("[image]", "");
      return (
        <div className={cn("max-w-[75%]", isMine && "text-right")}>
          <p className="text-[11px] text-muted-foreground mb-0.5">
            <span className="font-medium">{msg.profile?.name}</span>
            <span className="ml-1.5">{format(new Date(msg.created_at), "HH:mm")}</span>
          </p>
          <ChatImageMessage src={src} />
        </div>
      );
    }

    if (isPaymentSent) {
      return (
        <div className={cn("max-w-[75%]", isMine && "text-right")}>
          <p className="text-[11px] text-muted-foreground mb-0.5">
            <span className="font-medium">{msg.profile?.name}</span>
            <span className="ml-1.5">{format(new Date(msg.created_at), "HH:mm")}</span>
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm bg-success/15 border border-success/30 text-success dark:text-success">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{msg.message}</span>
          </div>
        </div>
      );
    }

    if (isTakenMsg) {
      return (
        <div className={cn("max-w-[75%]", isMine && "text-right")}>
          <p className="text-[11px] text-muted-foreground mb-0.5">
            <span className="font-medium">{msg.profile?.name}</span>
            <span className="ml-1.5">{format(new Date(msg.created_at), "HH:mm")}</span>
          </p>
          <div className="inline-block px-3 py-2 rounded-2xl text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-tl-sm">
            {msg.message}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("max-w-[75%]", isMine && "text-right")}>
        <p className="text-[11px] text-muted-foreground mb-0.5">
          <span className="font-medium">{msg.profile?.name}</span>
          <span className="ml-1.5">{format(new Date(msg.created_at), "HH:mm")}</span>
        </p>
        <div className={cn(
          "inline-block px-3 py-2 rounded-2xl text-sm whitespace-pre-line",
          isMine
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}>
          {msg.message}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden flex-1">
      {/* Conversation header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
        {isHost && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSelectedUserId(null); setActiveChatId(null); setMessages([]); loadInterestedUsers(); }}
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <p className="text-xs font-semibold truncate">{otherUserName}</p>
            {statusBadge}
            {isHost && selectedInterestStatus === "confirmed" && (
              <Badge className="text-[9px] h-4 px-1 bg-success/10 text-success border-success/20 border shrink-0">
                <CheckCircle2 className="w-2 h-2 mr-0.5" />Confirmed
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            <span className="font-medium">{gameLocation}</span>
            <span className="mx-1 opacity-40">·</span>
            <span>{format(new Date(gameDateTime), "MMM d · HH:mm")}</span>
            {isConfirmed && <span className="ml-1 text-success font-medium">· ✓ Confirmed</span>}
            {isTaken && !isConfirmed && <span className="ml-1 text-destructive font-medium">· Taken</span>}
          </p>
        </div>
        {isHost && selectedUser && selectedInterestStatus !== "confirmed" && !isCourtTaken && (
          <button
            onClick={() => onConfirmBooking?.(selectedUser.interest_id, selectedUser.user_id)}
            className={cn(
              "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors",
              stage === "payment_sent"
                ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
          >
            Confirm →
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {!activeChatId ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm">Opening chat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <MessageCircle className="w-10 h-10 text-muted-foreground opacity-40" />
            <div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Let the host know you're interested</p>
            </div>
            {!isHost && !inputDisabled && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-full"
                onClick={handlePrefillInterest}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                I'm Interested in This Court
              </Button>
            )}
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
              {renderBubble(msg)}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-2 py-2 border-t border-border space-y-1.5">
        {/* Quick reply chips */}
        {allChips.length > 0 && !inputDisabled && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {allChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => sendQuickReply(chip.message)}
                disabled={sendLoading}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors disabled:opacity-50",
                  chip.variant === "destructive"
                    ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                    : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Host Send Bank Details button */}
        {isHost && activeChatId && !inputDisabled && stage === "payment_request" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-1 border-primary bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
            onClick={handleSendBankDetails}
            disabled={sendLoading}
          >
            <CreditCard className="w-3 h-3" />
            Send Bank Details
          </Button>
        )}

        <div className="flex gap-1.5">
          {/* Hidden image input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={inputDisabled || uploadingImage}
          />
          {/* Image upload button */}
          {!inputDisabled && (
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage || sendLoading}
              className="h-9 w-9 shrink-0 rounded-lg border border-input bg-background flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-50"
              title="Send image"
            >
              {uploadingImage ? (
                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          )}
          <Input
            placeholder={inputDisabled ? "Court has been taken" : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="text-sm h-9"
            disabled={inputDisabled}
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9 shrink-0" disabled={inputDisabled || sendLoading}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
