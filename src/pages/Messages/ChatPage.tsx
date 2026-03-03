import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, MoreVertical, Copy, Trash2, BellOff, Ban } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ChatInputWithUpload } from "@/components/chat/ChatInputWithUpload";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

interface CourtContext {
  title: string;
  location: string;
  court_number: string | null;
  date_time: string;
  gameId: string;
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markAsRead } = useConversations();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; avatar_url: string | null; user_id: string } | null>(null);
  const [myProfile, setMyProfile] = useState<{ name: string; avatar_url: string | null } | null>(null);
  const [courtContext, setCourtContext] = useState<CourtContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId || !user) return;

    const fetchChat = async () => {
      const { data: chat } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (!chat) {
        navigate("/messages");
        return;
      }

      const otherUserId = chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id;

      // Fetch other user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", otherUserId)
        .single();

      setOtherUser(profile || { name: "Unknown", avatar_url: null, user_id: otherUserId });

      // Fetch own profile for avatar
      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (ownProfile) setMyProfile(ownProfile);

      // If this chat has a listing_id, fetch court context
      if (chat.listing_id) {
        const { data: game } = await supabase
          .from("games")
          .select("id, title, location, court_number, date_time")
          .eq("id", chat.listing_id)
          .single();

        if (game) {
          setCourtContext({
            title: game.title,
            location: game.location,
            court_number: game.court_number,
            date_time: game.date_time,
            gameId: game.id,
          });
        }
      }

      // Fetch messages
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id, message, sender_id, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);

      // Mark conversation as read
      markAsRead(chatId);

      // Fetch muted state
      const { data: pref } = await supabase
        .from("conversation_preferences")
        .select("muted")
        .eq("conversation_id", chatId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (pref) setMuted(pref.muted);
    };

    fetchChat();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !chatId || sending) return;
    setSending(true);
    const msg = newMessage.trim();
    setNewMessage("");

    await supabase.from("chat_messages").insert({
      chat_id: chatId,
      sender_id: user.id,
      message: msg,
    });

    setSending(false);
    inputRef.current?.focus();
  };

  const handleMuteChat = async () => {
    if (!user || !chatId) return;
    const newMuted = !muted;
    const { data: existing } = await supabase
      .from("conversation_preferences")
      .select("id")
      .eq("conversation_id", chatId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("conversation_preferences").update({ muted: newMuted }).eq("id", existing.id);
    } else {
      await supabase.from("conversation_preferences").insert({ conversation_id: chatId, user_id: user.id, muted: newMuted });
    }
    setMuted(newMuted);
    toast(newMuted ? "Chat muted" : "Chat unmuted");
  };

  const handleDeleteChat = async () => {
    if (!user || !chatId) return;
    const { data: existing } = await supabase
      .from("conversation_preferences")
      .select("id")
      .eq("conversation_id", chatId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("conversation_preferences").update({ deleted: true }).eq("id", existing.id);
    } else {
      await supabase.from("conversation_preferences").insert({ conversation_id: chatId, user_id: user.id, deleted: true });
    }
    toast("Chat deleted");
    navigate("/messages");
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  };

  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from("chat_messages").delete().eq("id", msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast("Message deleted");
  };

  const formatMessageTime = (dateStr: string) => format(new Date(dateStr), "HH:mm");

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const existing = groupedMessages.find((g) => g.date === dateKey);
    if (existing) {
      existing.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      {/* Header */}
      <div className="sticky top-0 z-50 glass-card border-b border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/messages")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {otherUser && (
            <button
              className="flex items-center gap-2.5 min-w-0"
              onClick={() => navigate(`/user/${otherUser.user_id}`)}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={otherUser.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {otherUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {courtContext && (
                    <Badge className="text-[9px] h-4 px-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 border shrink-0 font-semibold">
                      Court
                    </Badge>
                  )}
                  <span className="font-display font-semibold text-sm truncate">{otherUser.name}</span>
                </div>
              </div>
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 ml-auto">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMuteChat}>
                <BellOff className="w-4 h-4 mr-2" />
                {muted ? "Unmute" : "Mute"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast("User blocked (placeholder)")}>
                <Ban className="w-4 h-4 mr-2" />
                Block
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Court context banner */}
      {courtContext && (
        <button
          onClick={() => navigate(`/games/${courtContext.gameId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/5 border-b border-orange-500/10 text-xs text-muted-foreground hover:bg-orange-500/10 transition-colors"
        >
          <MapPin className="w-3 h-3 shrink-0 text-orange-500" />
          <span className="font-medium text-foreground truncate">{courtContext.title}</span>
          <span className="opacity-40">·</span>
          <span className="truncate">{courtContext.location}{courtContext.court_number ? ` · Court ${courtContext.court_number}` : ""}</span>
          <span className="opacity-40">·</span>
          <Calendar className="w-3 h-3 shrink-0" />
          <span className="whitespace-nowrap">{format(new Date(courtContext.date_time), "MMM d · HH:mm")}</span>
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Say hello! 👋</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-4">
                <span className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {formatDateSeparator(group.messages[0].created_at)}
                </span>
              </div>
              {group.messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const showAvatar =
                  !isMine &&
                  (i === 0 || group.messages[i - 1]?.sender_id !== msg.sender_id);
                const showTail =
                  i === group.messages.length - 1 ||
                  group.messages[i + 1]?.sender_id !== msg.sender_id;
                const isGameCard = /^\[game:[\w-]+\]$/.test(msg.message);

                return (
                  <div key={msg.id}>
                    {/* Sender name */}
                    {showAvatar && !isMine && otherUser && (
                      <p className="text-[11px] text-muted-foreground ml-9 mb-0.5">{otherUser.name}</p>
                    )}
                    <div
                      className={cn(
                        "flex gap-2 mb-0.5",
                        isMine ? "justify-end" : "justify-start",
                        showTail && "mb-2"
                      )}
                    >
                      {!isMine && (
                        <div className="w-7 shrink-0 self-end">
                          {showAvatar && otherUser && (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={otherUser.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      {isMine && <div className="flex-1" />}
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          {isGameCard ? (
                            <div className="max-w-[75%]">
                              <ChatMessageContent message={msg.message} isMine={isMine} />
                              <p className={cn(
                                "text-[10px] mt-0.5 text-right",
                                "text-muted-foreground"
                              )}>
                                {formatMessageTime(msg.created_at)}
                              </p>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "max-w-[75%] px-3.5 py-2 text-sm",
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                  : "bg-muted rounded-2xl rounded-bl-md"
                              )}
                            >
                              <ChatMessageContent message={msg.message} isMine={isMine} />
                              <p className={cn(
                                "text-[10px] mt-0.5 text-right",
                                isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {formatMessageTime(msg.created_at)}
                              </p>
                            </div>
                          )}
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => handleCopyMessage(msg.message)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </ContextMenuItem>
                          {isMine && (
                            <ContextMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                      {isMine && (
                        <div className="w-7 shrink-0 self-end">
                          {showAvatar && myProfile && (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={myProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {myProfile.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="sticky bottom-0 glass-card border-t border-border/50 px-3 py-2.5"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
      >
        <ChatInputWithUpload
          value={newMessage}
          onChange={setNewMessage}
          onSend={sendMessage}
          onImageSent={async (path) => {
            if (!user || !chatId) return;
            await supabase.from("chat_messages").insert({
              chat_id: chatId,
              sender_id: user.id,
              message: `[image]${path}`,
            });
          }}
          disabled={sending}
          userId={user?.id}
        />
      </div>
    </div>
  );
}
