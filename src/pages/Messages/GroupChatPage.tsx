import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Trophy, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

interface GameMessage {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

interface GameInfo {
  id: string;
  title: string;
  location: string;
  date_time: string;
  host_id: string;
}

export default function GroupChatPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
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
    if (!gameId || !user) return;

    const fetchData = async () => {
      // Get game info
      const { data: game } = await supabase
        .from("games")
        .select("id, title, location, date_time, host_id")
        .eq("id", gameId)
        .single();

      if (!game) {
        navigate("/messages");
        return;
      }
      setGameInfo(game);

      // Fetch messages with profiles
      await fetchMessages();
      setLoading(false);
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel(`game-chat-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_messages", filter: `game_id=eq.${gameId}` },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user?.id]);

  const fetchMessages = async () => {
    if (!gameId) return;
    const { data } = await supabase
      .from("game_messages")
      .select("id, message, user_id, created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      // Fetch profiles for senders
      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      });

      setMessages(
        data.map((m) => ({
          ...m,
          profiles: profileMap[m.user_id] || null,
        }))
      );
    } else {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !gameId || sending) return;
    setSending(true);
    const msg = newMessage.trim();
    setNewMessage("");

    await supabase.from("game_messages").insert({
      game_id: gameId,
      user_id: user.id,
      message: msg,
    });

    setSending(false);
    inputRef.current?.focus();
  };

  const formatMessageTime = (dateStr: string) => format(new Date(dateStr), "HH:mm");

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: GameMessage[] }[] = [];
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
          {gameInfo && (
            <button
              className="flex items-center gap-2.5 min-w-0 flex-1"
              onClick={() => navigate(`/games/${gameInfo.id}`)}
            >
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 border shrink-0 font-semibold">
                    Match
                  </Badge>
                  <span className="font-display font-semibold text-sm truncate">{gameInfo.title}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MapPin className="w-2.5 h-2.5" />
                  <span className="truncate">{gameInfo.location}</span>
                  <span className="opacity-40">·</span>
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{format(new Date(gameInfo.date_time), "MMM d · HH:mm")}</span>
                </div>
              </div>
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
            <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
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
                const isMine = msg.user_id === user?.id;
                const showAvatar =
                  !isMine &&
                  (i === 0 || group.messages[i - 1]?.user_id !== msg.user_id);
                const showTail =
                  i === group.messages.length - 1 ||
                  group.messages[i + 1]?.user_id !== msg.user_id;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2 mb-0.5",
                      isMine ? "justify-end" : "justify-start",
                      showTail && "mb-2"
                    )}
                  >
                    {!isMine && (
                      <div className="w-7 shrink-0">
                        {showAvatar && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {msg.profiles?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className={cn("max-w-[75%]")}>
                      {showAvatar && !isMine && (
                        <p className="text-[10px] text-muted-foreground mb-0.5 ml-1 font-medium">
                          {msg.profiles?.name}
                        </p>
                      )}
                      <div
                        className={cn(
                          "px-3.5 py-2 text-sm",
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
