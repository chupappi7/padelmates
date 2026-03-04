import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImagePlus, X, Calendar, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMOJI_OPTIONS = ["❤️", "🔥", "👏", "😂", "😮", "🎾"];

interface EmojiReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  author_name?: string;
  author_avatar?: string | null;
  reactions: EmojiReaction[];
}

interface Props {
  clubId: string;
  isAdmin: boolean;
  clubLogo?: string | null;
  clubName?: string;
}

export default function ClubFeedTab({ clubId, isAdmin, clubLogo, clubName }: Props) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Emoji picker
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [clubId]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("club_announcements")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set(data.map((a: any) => a.author_id))];
    const announcementIds = data.map((a: any) => a.id);

    const [profilesRes, reactionsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", authorIds),
      supabase.from("announcement_likes").select("announcement_id, emoji, user_id").in("announcement_id", announcementIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p: any) => [p.user_id, p]) || []);

    // Group reactions by announcement and emoji
    const reactionsByAnnouncement = new Map<string, Map<string, { count: number; myReaction: boolean }>>();
    (reactionsRes.data || []).forEach((r: any) => {
      if (!reactionsByAnnouncement.has(r.announcement_id)) {
        reactionsByAnnouncement.set(r.announcement_id, new Map());
      }
      const emojiMap = reactionsByAnnouncement.get(r.announcement_id)!;
      if (!emojiMap.has(r.emoji)) {
        emojiMap.set(r.emoji, { count: 0, myReaction: false });
      }
      const entry = emojiMap.get(r.emoji)!;
      entry.count++;
      if (user && r.user_id === user.id) entry.myReaction = true;
    });

    setAnnouncements(data.map((a: any) => {
      const emojiMap = reactionsByAnnouncement.get(a.id);
      const reactions: EmojiReaction[] = [];
      if (emojiMap) {
        emojiMap.forEach((val, emoji) => {
          reactions.push({ emoji, count: val.count, reacted_by_me: val.myReaction });
        });
      }
      // Sort by count desc
      reactions.sort((a, b) => b.count - a.count);

      return {
        ...a,
        author_name: profileMap.get(a.author_id)?.name || "Admin",
        author_avatar: profileMap.get(a.author_id)?.avatar_url,
        reactions,
      };
    }));
    setLoading(false);
  };

  // ── Compose ──
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = "";
  };

  const handlePost = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    setPosting(true);

    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-announcements").upload(path, imageFile);
      if (upErr) { toast.error("Image upload failed"); setPosting(false); return; }
      const { data: urlData } = supabase.storage.from("club-announcements").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("club_announcements").insert({
      club_id: clubId,
      author_id: user.id,
      title: title.trim(),
      content: body.trim(),
      image_url,
    } as any);

    if (error) toast.error("Failed to post");
    else {
      toast.success("Posted!");
      setTitle(""); setBody(""); removeImage(); setShowCompose(false);
      fetchAnnouncements();
    }
    setPosting(false);
  };

  // ── Edit ──
  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditBody(a.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editBody.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.from("club_announcements")
      .update({ title: editTitle.trim(), content: editBody.trim() } as any)
      .eq("id", editingId);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Updated!");
      setEditingId(null);
      fetchAnnouncements();
    }
    setEditSaving(false);
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    await supabase.from("club_announcements").delete().eq("id", id);
    toast.success("Deleted");
    fetchAnnouncements();
  };

  // ── Emoji Reactions ──
  const toggleReaction = async (announcementId: string, emoji: string) => {
    if (!user) { toast.error("Sign in to react"); return; }
    setEmojiPickerOpen(null);

    const announcement = announcements.find(a => a.id === announcementId);
    const existing = announcement?.reactions.find(r => r.emoji === emoji && r.reacted_by_me);

    if (existing) {
      await supabase.from("announcement_likes").delete()
        .eq("announcement_id", announcementId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await supabase.from("announcement_likes").insert({
        announcement_id: announcementId, user_id: user.id, emoji,
      } as any);
    }

    // Optimistic update
    setAnnouncements(prev => prev.map(a => {
      if (a.id !== announcementId) return a;
      let reactions = [...a.reactions];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (existing) {
        if (idx !== -1) {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, reacted_by_me: false };
          if (reactions[idx].count <= 0) reactions.splice(idx, 1);
        }
      } else {
        if (idx !== -1) {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, reacted_by_me: true };
        } else {
          reactions.push({ emoji, count: 1, reacted_by_me: true });
        }
      }
      return { ...a, reactions };
    }));
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
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compose area for admins */}
      {isAdmin && !showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-muted-foreground hover:border-primary/30 transition-colors"
        >
          <Avatar className="h-9 w-9 rounded-full">
            <AvatarImage src={clubLogo || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{clubName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm">Write an announcement...</span>
        </button>
      )}

      {isAdmin && showCompose && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarImage src={clubLogo || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{clubName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{clubName}</p>
              <p className="text-[10px] text-muted-foreground">Posting as admin</p>
            </div>
            <button onClick={() => { setShowCompose(false); removeImage(); }} className="ml-auto">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="h-10 border-0 bg-muted/50 font-semibold" />
          <Textarea placeholder="What's happening at the club?" value={body} onChange={e => setBody(e.target.value)} rows={3} className="border-0 bg-muted/50" />

          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg object-cover max-h-48" />
              <button onClick={removeImage} className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => imageRef.current?.click()} className="text-muted-foreground hover:text-foreground transition-colors">
              <ImagePlus className="w-5 h-5" />
            </button>
            <Button variant="hero" size="sm" onClick={handlePost} disabled={posting || !title.trim() || !body.trim()}>
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {announcements.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-bold mb-1">No announcements yet</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Create the first post for your club!" : "Stay tuned for updates from the club."}
          </p>
        </div>
      )}

      {/* Announcements */}
      {announcements.map(a => (
        <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-full">
                  <AvatarImage src={clubLogo || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{clubName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Avatar className="h-5 w-5 rounded-full absolute -bottom-1 -right-1 border-2 border-card">
                  <AvatarImage src={a.author_avatar || undefined} />
                  <AvatarFallback className="text-[8px] bg-muted font-bold">{a.author_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block">{clubName}</span>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{a.author_name}</span>
                  <span>·</span>
                  <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold text-[9px]">Admin</span>
                  <span>·</span>
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              </div>

              {/* 3-dot menu for admin */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEdit(a)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(a.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Content or Edit form */}
          {editingId === a.id ? (
            <div className="px-4 pb-3 space-y-2">
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-9 font-semibold border-0 bg-muted/50" />
              <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={2} className="border-0 bg-muted/50 text-sm" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button variant="hero" size="sm" onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-2">
              <h4 className="font-display font-bold text-sm mb-1">{a.title}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{a.content}</p>
            </div>
          )}

          {/* Image */}
          {a.image_url && (
            <img
              src={a.image_url}
              alt=""
              className="w-full object-cover max-h-72 cursor-pointer"
              onClick={() => window.open(a.image_url!, "_blank")}
            />
          )}

          {/* Emoji Reactions bar */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-t border-border flex-wrap">
            {/* Existing reactions */}
            {a.reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(a.id, r.emoji)}
                className={`flex items-center gap-1 text-xs rounded-full px-2 py-1 transition-colors border ${
                  r.reacted_by_me
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}

            {/* Add reaction button */}
            <div className="relative">
              <button
                onClick={() => setEmojiPickerOpen(emojiPickerOpen === a.id ? null : a.id)}
                className="flex items-center justify-center w-7 h-7 rounded-full border border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors text-xs"
              >
                +
              </button>
              {emojiPickerOpen === a.id && (
                <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-xl shadow-lg p-1.5 flex gap-0.5 z-10">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(a.id, emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
