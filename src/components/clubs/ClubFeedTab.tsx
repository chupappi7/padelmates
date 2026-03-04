import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, ImagePlus, X, Calendar } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  author_name?: string;
  author_avatar?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  name?: string;
  avatar_url?: string | null;
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

  // Comments state
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

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

    const [profilesRes, likesRes, myLikesRes, commentsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", authorIds),
      supabase.from("announcement_likes").select("announcement_id").in("announcement_id", announcementIds),
      user
        ? supabase.from("announcement_likes").select("announcement_id").in("announcement_id", announcementIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      supabase.from("announcement_comments").select("announcement_id").in("announcement_id", announcementIds),
    ]);

    const profileMap = new Map(profilesRes.data?.map((p: any) => [p.user_id, p]) || []);

    const likeCounts = new Map<string, number>();
    (likesRes.data || []).forEach((l: any) => likeCounts.set(l.announcement_id, (likeCounts.get(l.announcement_id) || 0) + 1));

    const myLikeSet = new Set((myLikesRes as any).data?.map((l: any) => l.announcement_id) || []);

    const commentCounts = new Map<string, number>();
    (commentsRes.data || []).forEach((c: any) => commentCounts.set(c.announcement_id, (commentCounts.get(c.announcement_id) || 0) + 1));

    setAnnouncements(data.map((a: any) => ({
      ...a,
      author_name: profileMap.get(a.author_id)?.name || "Admin",
      author_avatar: profileMap.get(a.author_id)?.avatar_url,
      like_count: likeCounts.get(a.id) || 0,
      comment_count: commentCounts.get(a.id) || 0,
      liked_by_me: myLikeSet.has(a.id),
    })));
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

  // ── Like ──
  const toggleLike = async (announcementId: string, currentlyLiked: boolean) => {
    if (!user) { toast.error("Sign in to like"); return; }
    if (currentlyLiked) {
      await supabase.from("announcement_likes").delete().eq("announcement_id", announcementId).eq("user_id", user.id);
    } else {
      await supabase.from("announcement_likes").insert({ announcement_id: announcementId, user_id: user.id } as any);
    }
    setAnnouncements(prev => prev.map(a =>
      a.id === announcementId
        ? { ...a, liked_by_me: !currentlyLiked, like_count: a.like_count + (currentlyLiked ? -1 : 1) }
        : a
    ));
  };

  // ── Comments ──
  const loadComments = async (announcementId: string) => {
    if (openComments === announcementId) { setOpenComments(null); return; }
    setOpenComments(announcementId);
    setLoadingComments(true);
    setCommentText("");

    const { data } = await supabase
      .from("announcement_comments")
      .select("*")
      .eq("announcement_id", announcementId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const uids = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", uids);
      const pMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      setComments(data.map((c: any) => ({ ...c, name: pMap.get(c.user_id)?.name || "User", avatar_url: pMap.get(c.user_id)?.avatar_url })));
    } else {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const postComment = async (announcementId: string) => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from("announcement_comments").insert({
      announcement_id: announcementId,
      user_id: user.id,
      content: commentText.trim(),
    } as any);
    if (error) { toast.error("Failed"); return; }
    setCommentText("");
    loadComments(announcementId);
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, comment_count: a.comment_count + 1 } : a));
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
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg object-cover max-h-48" />
              <button onClick={removeImage} className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

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
          {/* Header: club logo + admin avatar overlay */}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{clubName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{a.author_name}</span>
                  <span>·</span>
                  <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold text-[9px]">Admin</span>
                  <span>·</span>
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <h4 className="font-display font-bold text-sm mb-1">{a.title}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{a.content}</p>
          </div>

          {/* Image */}
          {a.image_url && (
            <img
              src={a.image_url}
              alt=""
              className="w-full object-cover max-h-72 cursor-pointer"
              onClick={() => window.open(a.image_url!, "_blank")}
            />
          )}

          {/* Like & Comment bar */}
          <div className="px-4 py-2.5 flex items-center gap-5 border-t border-border">
            <button
              onClick={() => toggleLike(a.id, a.liked_by_me)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${a.liked_by_me ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`w-4 h-4 ${a.liked_by_me ? "fill-current" : ""}`} />
              {a.like_count > 0 && <span className="text-xs font-medium">{a.like_count}</span>}
            </button>
            <button
              onClick={() => loadComments(a.id)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {a.comment_count > 0 && <span className="text-xs font-medium">{a.comment_count}</span>}
            </button>
          </div>

          {/* Comments section */}
          {openComments === a.id && (
            <div className="border-t border-border px-4 py-3 space-y-3">
              {loadingComments ? (
                <div className="h-8 bg-muted/50 rounded animate-pulse" />
              ) : (
                <>
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 rounded-full shrink-0 mt-0.5">
                        <AvatarImage src={c.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-muted font-bold">{c.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-1">No comments yet</p>
                  )}
                </>
              )}

              {user && (
                <div className="flex items-center gap-2">
                  <Input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 h-8 text-xs rounded-full bg-muted/50 border-0"
                    onKeyDown={e => e.key === "Enter" && postComment(a.id)}
                  />
                  <button
                    onClick={() => postComment(a.id)}
                    disabled={!commentText.trim()}
                    className="text-primary disabled:text-muted-foreground transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
