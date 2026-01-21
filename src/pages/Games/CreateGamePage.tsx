import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Users, Euro, Trophy } from "lucide-react";

export default function CreateGamePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    dateTime: "",
    skillLevel: "intermediate",
    maxPlayers: 8,
    pricePerPlayer: 0,
    paymentInstructions: "",
    format: "casual_match",
    visibility: "public",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a game");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.from("games").insert({
      title: formData.title,
      description: formData.description,
      location: formData.location,
      date_time: new Date(formData.dateTime).toISOString(),
      skill_level: formData.skillLevel as "beginner" | "intermediate" | "advanced",
      max_players: formData.maxPlayers,
      price_per_player: formData.pricePerPlayer,
      payment_instructions: formData.paymentInstructions,
      format: formData.format as "casual_match" | "americano" | "team_americano",
      visibility: formData.visibility as "public" | "private" | "club_only",
      host_id: user.id,
    }).select().single();

    if (error) {
      toast.error("Failed to create game");
      setLoading(false);
      return;
    }

    toast.success("Game created successfully!");
    navigate(`/games/${data.id}`);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Host a Game</h1>
            <p className="text-muted-foreground">
              Create a new padel game and invite players to join
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Game Details
              </h2>

              <div className="space-y-2">
                <Label htmlFor="title">Game Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Friday Night Americano"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell players what to expect..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Game Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(v) => handleChange("format", v)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual_match">Casual Match</SelectItem>
                      <SelectItem value="americano">Americano</SelectItem>
                      <SelectItem value="team_americano">Team Americano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skill">Skill Level</Label>
                  <Select
                    value={formData.skillLevel}
                    onValueChange={(v) => handleChange("skillLevel", v)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">🟢 Beginner</SelectItem>
                      <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                      <SelectItem value="advanced">🔴 Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                When & Where
              </h2>

              <div className="space-y-2">
                <Label htmlFor="location">Court / Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g., Padel Club Barcelona"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => handleChange("dateTime", e.target.value)}
                  required
                  className="h-12"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Players & Payment
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPlayers">Max Players</Label>
                  <Select
                    value={String(formData.maxPlayers)}
                    onValueChange={(v) => handleChange("maxPlayers", parseInt(v))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 players</SelectItem>
                      <SelectItem value="8">8 players</SelectItem>
                      <SelectItem value="12">12 players</SelectItem>
                      <SelectItem value="16">16 players</SelectItem>
                      <SelectItem value="20">20 players</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per Player (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.pricePerPlayer}
                      onChange={(e) => handleChange("pricePerPlayer", parseFloat(e.target.value))}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Payment Instructions</Label>
                <Textarea
                  id="payment"
                  placeholder="e.g., Pay via Revolut to @johndoe or bank transfer to ES1234..."
                  value={formData.paymentInstructions}
                  onChange={(e) => handleChange("paymentInstructions", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => handleChange("visibility", v)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌍 Public - Anyone can find</SelectItem>
                    <SelectItem value="private">🔗 Private - Link only</SelectItem>
                    <SelectItem value="club_only">🏠 Club Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="flex-1" disabled={loading}>
                {loading ? "Creating..." : "Create Game"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
