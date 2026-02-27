import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Globe, Instagram, MessageCircle } from "lucide-react";

export default function CreateClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    website: "",
    instagram: "",
    whatsapp: "",
  });

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Club name is required");
      return;
    }

    setLoading(true);
    try {
      let logo_url: string | null = null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("club-logos")
          .upload(path, logoFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("club-logos")
          .getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      // Build description with optional social/contact info
      const descParts = [form.description];
      if (form.location) descParts.push(`📍 ${form.location}`);
      if (form.website) descParts.push(`🌐 ${form.website}`);
      if (form.instagram) descParts.push(`📸 @${form.instagram.replace("@", "")}`);
      if (form.whatsapp) descParts.push(`💬 ${form.whatsapp}`);

      const { data, error } = await supabase
        .from("clubs")
        .insert({
          name: form.name.trim(),
          description: descParts.filter(Boolean).join("\n"),
          logo_url,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Auto-follow own club
      await supabase.from("club_followers").insert({
        club_id: data.id,
        user_id: user.id,
      });

      toast.success("Club created!");
      navigate(`/clubs/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create club");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-lg py-6 pb-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-2xl font-bold">Create Club</h1>
          </div>

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-24 w-24 rounded-2xl">
                <AvatarImage src={logoPreview || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-3xl rounded-2xl">
                  {form.name ? form.name.charAt(0).toUpperCase() : "C"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoSelect}
            />
            <p className="text-xs text-muted-foreground mt-2">Tap to upload logo</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Club Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Padel Kings BCN"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                maxLength={50}
                className="h-12"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Tell people what your club is about..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g. Barcelona, Spain"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                maxLength={100}
                className="h-11"
              />
            </div>

            {/* Social / Contact — collapsible row */}
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Social & Contact (optional)</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Website URL"
                    value={form.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Instagram handle"
                    value={form.instagram}
                    onChange={(e) => handleChange("instagram", e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="WhatsApp group link"
                    value={form.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            variant="hero"
            size="lg"
            className="w-full mt-8"
            onClick={handleSubmit}
            disabled={loading || !form.name.trim()}
          >
            {loading ? "Creating..." : "Create Club"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
