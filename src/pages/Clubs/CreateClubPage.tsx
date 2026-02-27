import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Globe, Instagram } from "lucide-react";

export default function CreateClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    city: "",
    country: "",
    num_courts: "",
    is_private: false,
    instagram_url: "",
    website_url: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB"); return; }
    if (type === "logo") { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); }
    else { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name.trim()) { toast.error("Club name is required"); return; }

    setLoading(true);
    try {
      const logo_url = logoFile ? await uploadFile(logoFile, "club-logos") : null;
      const cover_url = coverFile ? await uploadFile(coverFile, "club-logos") : null;

      const { data, error } = await supabase
        .from("clubs")
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          logo_url,
          cover_url,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          num_courts: form.num_courts ? parseInt(form.num_courts) : null,
          is_private: form.is_private,
          instagram_url: form.instagram_url.trim() || null,
          website_url: form.website_url.trim() || null,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Auto-follow as owner
      await supabase.from("club_followers").insert({
        club_id: data.id,
        user_id: user.id,
        role: "owner",
        status: "active",
      });

      toast.success("Club created!");
      navigate(`/clubs/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create club");
    } finally {
      setLoading(false);
    }
  };

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg py-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-2xl font-bold">Create Club</h1>
          </div>

          {/* Cover Photo */}
          <div
            className="h-32 rounded-xl mb-4 relative cursor-pointer overflow-hidden group"
            style={{
              background: coverPreview
                ? `url(${coverPreview}) center/cover`
                : "linear-gradient(135deg, #0D2137, #1A4060)",
            }}
            onClick={() => coverRef.current?.click()}
          >
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "cover")} />
            <span className="absolute bottom-2 right-2 text-[10px] text-white/70 bg-black/30 px-2 py-0.5 rounded">Cover Photo</span>
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center mb-6 -mt-10 relative z-10">
            <div className="relative cursor-pointer group" onClick={() => logoRef.current?.click()}>
              <Avatar className="h-20 w-20 rounded-xl border-4 border-background shadow-md">
                <AvatarImage src={logoPreview || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl rounded-xl">
                  {form.name ? form.name.charAt(0).toUpperCase() : "C"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, "logo")} />
            <p className="text-xs text-muted-foreground mt-1.5">Tap to upload logo</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Club Name *</Label>
              <Input placeholder="e.g. Padel Kings BCN" value={form.name} onChange={e => handleChange("name", e.target.value)} maxLength={50} className="h-12" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Tell people what your club is about..." value={form.description} onChange={e => handleChange("description", e.target.value)} maxLength={500} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> City</Label>
                <Input placeholder="Barcelona" value={form.city} onChange={e => handleChange("city", e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input placeholder="Spain" value={form.country} onChange={e => handleChange("country", e.target.value)} className="h-11" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Number of Courts</Label>
              <Input type="number" placeholder="e.g. 4" value={form.num_courts} onChange={e => handleChange("num_courts", e.target.value)} className="h-11" />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Private Club</Label>
                <p className="text-xs text-muted-foreground">Requires admin approval to join</p>
              </div>
              <Switch checked={form.is_private} onCheckedChange={v => handleChange("is_private", v)} />
            </div>

            <div className="space-y-3 pt-1">
              <p className="text-sm font-medium text-muted-foreground">Social (optional)</p>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Instagram handle or URL" value={form.instagram_url} onChange={e => handleChange("instagram_url", e.target.value)} className="pl-10 h-11" />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Website URL" value={form.website_url} onChange={e => handleChange("website_url", e.target.value)} className="pl-10 h-11" />
              </div>
            </div>
          </div>

          <Button variant="hero" size="lg" className="w-full mt-8" onClick={handleSubmit} disabled={loading || !form.name.trim()}>
            {loading ? "Creating..." : "Create Club"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
