import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
}

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; avatar_url: string | null; user_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
      // Get chat details
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

      // Fetch messages
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("id, message, sender_id, created_at")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);
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

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "HH:mm");
  };

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
              <span className="font-display font-semibold text-sm truncate">{otherUser.name}</span>
            </button>
          )}
        </div>
      </div>

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
                const showTail =
                  i === group.messages.length - 1 ||
                  group.messages[i + 1]?.sender_id !== msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex mb-0.5",
                      isMine ? "justify-end" : "justify-start",
                      showTail && "mb-2"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-3.5 py-2 text-sm",
                        isMine
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-muted rounded-2xl rounded-bl-md"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p className={cn(
                        "text-[10px] mt-0.5 text-right",
                        isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {formatMessageTime(msg.created_at)}
                      </p>
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1 h-10"
          />
          <Button
            type="submit"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
