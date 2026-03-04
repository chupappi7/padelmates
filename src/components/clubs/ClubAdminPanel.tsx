import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  X, BarChart3, Megaphone, Users, Settings, Plus, Trash2,
  Pin, PinOff, Shield, ShieldOff, UserX, Camera
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  country: string | null;
  num_courts: number | null;
  is_private: boolean;
  instagram_url: string | null;
  website_url: string | null;
}

type AdminTab = "manage" | "announcements" | "members" | "settings";

interface Props {
  clubId: string;
  club: Club;
  isOwner: boolean;
  onClose: () => void;
  onClubUpdated: () => void;
}

export default function ClubAdminPanel({ clubId, club, isOwner, onClose, onClubUpdated }: Props) {
  const [tab, setTab] = useState<AdminTab>("manage");
  const { user } = useAuth();
  const navigate = useNavigate();

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "manage", label: "Manage", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "announcements", label: "Announcements", icon: <Megaphone className="w-4 h-4" /> },
    { id: "members", label: "Members", icon: <Users className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Club Admin</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-28 max-w-2xl mx-auto">
        {tab === "manage" && <ManageTab clubId={clubId} />}
        {tab === "announcements" && <AnnouncementsTab clubId={clubId} />}
        {tab === "members" && <MembersTab clubId={clubId} club={club} isOwner={isOwner} />}
        {tab === "settings" && <SettingsTab club={club} isOwner={isOwner} onClose={onClose} onClubUpdated={onClubUpdated} />}
      </div>
    </div>
  );
}

/* ── Manage Tab ── */
function ManageTab({ clubId }: { clubId: string }) {
  const [stats, setStats] = useState({ newMembers: 0, upcoming: 0, pending: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const now = new Date().toISOString();
      const [newRes, upRes, pendRes] = await Promise.all([
        supabase.from("club_followers").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active").gte("created_at", oneWeekAgo),
        supabase.from("games").select("id", { count: "exact", head: true }).eq("club_id", clubId).gte("date_time", now),
        supabase.from("club_followers").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "pending"),
      ]);
      setStats({ newMembers: newRes.count || 0, upcoming: upRes.count || 0, pending: pendRes.count || 0 });
    };
    fetch();
  }, [clubId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "New this week", value: stats.newMembers },
          { label: "Upcoming events", value: stats.upcoming },
          { label: "Pending requests", value: stats.pending },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <Button variant="hero" className="w-full" onClick={() => navigate("/games/create")}>
        <Plus className="w-4 h-4" /> Create Event
      </Button>
    </div>
  );
}

/* ── Announcements Tab ── */
function AnnouncementsTab({ clubId }: { clubId: string }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchAnnouncements(); }, [clubId]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("club_announcements")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only images allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
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
    if (!title.trim() || !content.trim() || !user) return;
    setSaving(true);

    let image_url: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("club-announcements").upload(path, imageFile);
      if (upErr) { toast.error("Image upload failed"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("club-announcements").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("club_announcements").insert({
      club_id: clubId,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      image_url,
    } as any);
    if (error) { toast.error("Failed to post"); }
    else {
      toast.success("Announcement posted!");
      setTitle(""); setContent(""); removeImage(); setShowForm(false);
      fetchAnnouncements();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("club_announcements").delete().eq("id", id);
    toast.success("Deleted");
    fetchAnnouncements();
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button variant="hero" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Announcement
        </Button>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="h-11" />
          <Textarea placeholder="Body" value={content} onChange={e => setContent(e.target.value)} rows={3} />

          {/* Image upload */}
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg object-cover max-h-48" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Camera className="w-4 h-4" /> Add Photo
            </button>
          )}

          <div className="flex gap-2">
            <Button variant="hero" onClick={handlePost} disabled={saving || !title.trim() || !content.trim()} className="flex-1">
              {saving ? "Posting..." : "Post"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); removeImage(); }}>Cancel</Button>
          </div>
        </div>
      )}

      {announcements.map(a => (
        <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm">{a.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
            {a.image_url && (
              <img src={a.image_url} alt="" className="mt-2 w-full rounded-lg object-cover max-h-32" />
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)} className="shrink-0">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/* ── Members Tab ── */
function MembersTab({ clubId, club, isOwner }: { clubId: string; club: Club; isOwner: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);

  useEffect(() => { fetch(); }, [clubId]);

  const fetch = async () => {
    const { data } = await supabase
      .from("club_followers")
      .select("id, user_id, role, status, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (!data) return;

    const userIds = data.map(d => d.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const pMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const enriched = data.map(d => ({
      ...d,
      name: pMap.get(d.user_id)?.name || "Unknown",
      avatar_url: pMap.get(d.user_id)?.avatar_url || null,
    }));

    setMembers(enriched.filter(m => m.status === "active"));
    setPending(enriched.filter(m => m.status === "pending"));
  };

  const updateRole = async (userId: string, role: string) => {
    await supabase.from("club_followers").update({ role }).eq("club_id", clubId).eq("user_id", userId);
    toast.success("Role updated");
    fetch();
  };

  const removeMember = async (userId: string) => {
    await supabase.from("club_followers").delete().eq("club_id", clubId).eq("user_id", userId);
    toast.success("Member removed");
    fetch();
  };

  const approvePending = async (userId: string) => {
    await supabase.from("club_followers").update({ status: "active" }).eq("club_id", clubId).eq("user_id", userId);
    toast.success("Approved!");
    fetch();
  };

  const declinePending = async (userId: string) => {
    await supabase.from("club_followers").delete().eq("club_id", clubId).eq("user_id", userId);
    toast.success("Declined");
    fetch();
  };

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-sm mb-2">Pending Requests ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <Avatar className="h-9 w-9 rounded-xl">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">{m.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm flex-1">{m.name}</span>
                <Button size="sm" variant="hero" onClick={() => approvePending(m.user_id)}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => declinePending(m.user_id)}>Decline</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display font-bold text-sm mb-2">Members ({members.length})</h3>
        <div className="space-y-1">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50">
              <Avatar className="h-9 w-9 rounded-xl">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl">{m.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{m.name}</span>
                  {m.role === "owner" && <Badge className="text-[10px] bg-[hsl(220,25%,10%)] text-white border-0 rounded px-1.5 py-0">Owner</Badge>}
                  {m.role === "admin" && <Badge className="text-[10px] bg-primary text-primary-foreground border-0 rounded px-1.5 py-0">Admin</Badge>}
                </div>
              </div>
              {m.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isOwner && m.role === "member" && (
                      <DropdownMenuItem onClick={() => updateRole(m.user_id, "admin")}>
                        <Shield className="w-4 h-4 mr-2" /> Make Admin
                      </DropdownMenuItem>
                    )}
                    {isOwner && m.role === "admin" && (
                      <DropdownMenuItem onClick={() => updateRole(m.user_id, "member")}>
                        <ShieldOff className="w-4 h-4 mr-2" /> Remove Admin
                      </DropdownMenuItem>
                    )}
                    {(isOwner || m.role === "member") && (
                      <DropdownMenuItem onClick={() => removeMember(m.user_id)} className="text-destructive">
                        <UserX className="w-4 h-4 mr-2" /> Remove from Club
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Settings Tab ── */
function SettingsTab({ club, isOwner, onClose, onClubUpdated }: { club: Club; isOwner: boolean; onClose: () => void; onClubUpdated: () => void }) {
  const navigate = useNavigate();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: club.name,
    description: club.description || "",
    city: club.city || "",
    country: club.country || "",
    num_courts: club.num_courts?.toString() || "",
    is_private: club.is_private,
    instagram_url: club.instagram_url || "",
    website_url: club.website_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);

    const { error } = await supabase
      .from("clubs")
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        num_courts: form.num_courts ? parseInt(form.num_courts) : null,
        is_private: form.is_private,
        instagram_url: form.instagram_url.trim() || null,
        website_url: form.website_url.trim() || null,
      })
      .eq("id", club.id);

    if (error) toast.error("Failed to save");
    else { toast.success("Settings saved!"); onClubUpdated(); }
    setSaving(false);
  };

  const handleUpload = async (file: File, type: "logo" | "cover") => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const bucket = type === "logo" ? "club-logos" : "club-logos";

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed"); return; }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const field = type === "logo" ? "logo_url" : "cover_url";
    await supabase.from("clubs").update({ [field]: urlData.publicUrl }).eq("id", club.id);
    toast.success(`${type === "logo" ? "Logo" : "Cover"} updated!`);
    onClubUpdated();
  };

  const handleDelete = async () => {
    if (deleteConfirm !== club.name) { toast.error("Type the club name to confirm"); return; }
    await supabase.from("clubs").delete().eq("id", club.id);
    toast.success("Club deleted");
    onClose();
    navigate("/clubs");
  };

  return (
    <div className="space-y-5">
      {/* Photos */}
      <div className="space-y-3">
        <Label>Club Logo</Label>
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 rounded-xl">
            <AvatarImage src={club.logo_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl rounded-xl">{club.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
            <Camera className="w-4 h-4 mr-1" /> Change Logo
          </Button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
        </div>

        <Label>Cover Photo</Label>
        <Button variant="outline" size="sm" onClick={() => coverRef.current?.click()}>
          <Camera className="w-4 h-4 mr-1" /> Upload Cover
        </Button>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "cover")} />
      </div>

      {/* Form */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Club Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label>About</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="h-11" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Number of Courts</Label>
          <Input type="number" value={form.num_courts} onChange={e => setForm(f => ({ ...f, num_courts: e.target.value }))} className="h-11" />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <Label>Private Club</Label>
            <p className="text-xs text-muted-foreground">Requires admin approval to join</p>
          </div>
          <Switch checked={form.is_private} onCheckedChange={v => setForm(f => ({ ...f, is_private: v }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Instagram URL</Label>
          <Input value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} className="h-11" placeholder="@handle or URL" />
        </div>
        <div className="space-y-1.5">
          <Label>Website URL</Label>
          <Input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} className="h-11" placeholder="https://..." />
        </div>
      </div>

      <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* Danger zone */}
      {isOwner && (
        <div className="border border-destructive/30 rounded-xl p-4 mt-6 space-y-3">
          <h4 className="font-display font-bold text-destructive">Danger Zone</h4>
          <p className="text-xs text-muted-foreground">Type <strong>{club.name}</strong> to confirm deletion.</p>
          <Input
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="Type club name..."
            className="h-11"
          />
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleDelete}
            disabled={deleteConfirm !== club.name}
          >
            <Trash2 className="w-4 h-4" /> Delete Club
          </Button>
        </div>
      )}
    </div>
  );
}
