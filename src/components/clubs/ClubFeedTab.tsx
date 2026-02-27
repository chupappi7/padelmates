import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pin, Calendar } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string | null;
}

export default function ClubFeedTab({ clubId, isAdmin }: { clubId: string; isAdmin: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
  }, [clubId]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("club_announcements")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map(a => a.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setAnnouncements(data.map(a => ({
        ...a,
        author_name: profileMap.get(a.author_id)?.name || "Admin",
        author_avatar: profileMap.get(a.author_id)?.avatar_url,
      })));
    } else {
      setAnnouncements([]);
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-bold mb-1">No activity yet</h3>
        <p className="text-sm text-muted-foreground">Be the first to play a club match!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map(a => {
        const expanded = expandedIds.has(a.id);
        return (
          <div
            key={a.id}
            className="bg-card border border-border rounded-xl p-4 border-l-4 border-l-primary bg-primary/5 cursor-pointer"
            onClick={() => toggleExpand(a.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
              <Avatar className="h-6 w-6">
                <AvatarImage src={a.author_avatar || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                  {a.author_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{a.author_name}</span>
              <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold">Admin</span>
              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(a.created_at)}</span>
            </div>
            <h4 className="font-display font-bold text-sm mb-1">{a.title}</h4>
            <p className={`text-sm text-muted-foreground whitespace-pre-line ${expanded ? "" : "line-clamp-3"}`}>
              {a.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
