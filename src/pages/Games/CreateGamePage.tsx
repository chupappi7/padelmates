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
import { ArrowLeft, Calendar, MapPin, Users, Euro, Trophy, CreditCard, Clock, Info } from "lucide-react";

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
    paymentMode: "pay_to_join",
    paymentDeadlineHours: 48,
    format: "casual_match",
    visibility: "public",
    hostIsPlaying: true,
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
      payment_mode: formData.paymentMode,
      payment_deadline_hours: formData.paymentDeadlineHours,
      format: formData.format as "casual_match" | "americano" | "team_americano",
      visibility: formData.visibility as "public" | "private" | "club_only",
      host_id: user.id,
      host_is_playing: formData.hostIsPlaying,
    }).select().single();

    if (error) {
      toast.error("Failed to create game");
      setLoading(false);
      return;
    }

    toast.success("Game created successfully!");
    navigate(`/games/${data.id}`);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 md:py-8 max-w-2xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6 md:mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">Host a Game</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Create a new padel game and invite players to join
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {/* Game Details */}
            <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
              <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Game Details
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm">Game Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Friday Night Americano"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell players what to expect..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="format" className="text-sm">Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(v) => handleChange("format", v)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual_match">Casual Match</SelectItem>
                      <SelectItem value="americano">Americano</SelectItem>
                      <SelectItem value="team_americano">Team Americano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="skill" className="text-sm">Skill Level</Label>
                  <Select
                    value={formData.skillLevel}
                    onValueChange={(v) => handleChange("skillLevel", v)}
                  >
                    <SelectTrigger className="h-11">
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

            {/* When & Where */}
            <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
              <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                When & Where
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-sm">Court / Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="e.g., Padel Club Barcelona"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateTime" className="text-sm">Date & Time</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => handleChange("dateTime", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </div>

            {/* Players & Payment */}
            <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
              <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Players & Payment
              </h2>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="maxPlayers" className="text-sm">Max Players</Label>
                  <Select
                    value={String(formData.maxPlayers)}
                    onValueChange={(v) => handleChange("maxPlayers", parseInt(v))}
                  >
                    <SelectTrigger className="h-11">
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

                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm">Price (€)</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.pricePerPlayer}
                      onChange={(e) => handleChange("pricePerPlayer", parseFloat(e.target.value) || 0)}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Host Role Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Your Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("hostIsPlaying", true)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      formData.hostIsPlaying
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🎾 Playing</p>
                      <p className="text-xs text-muted-foreground">I'm joining the game</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("hostIsPlaying", false)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                      !formData.hostIsPlaying
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">📋 Organizer</p>
                      <p className="text-xs text-muted-foreground">Just organizing</p>
                    </div>
                  </button>
                </div>
              </div>


              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Mode</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("paymentMode", "pay_to_join")}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      formData.paymentMode === "pay_to_join"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">💸 Pay to Join</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Players upload payment proof before you confirm them
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("paymentMode", "confirm_first")}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      formData.paymentMode === "confirm_first"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">🕒 Confirm First, Pay Later</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Accept players first, request payment closer to game time
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Deadline (for Confirm First mode) */}
              {formData.paymentMode === "confirm_first" && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Request Payment</Label>
                  <Select
                    value={String(formData.paymentDeadlineHours)}
                    onValueChange={(v) => handleChange("paymentDeadlineHours", parseInt(v))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 hours before game</SelectItem>
                      <SelectItem value="48">48 hours before game</SelectItem>
                      <SelectItem value="72">72 hours before game</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="payment" className="text-sm">Payment Instructions</Label>
                <Textarea
                  id="payment"
                  placeholder="e.g., Pay via Revolut to @johndoe or bank transfer to ES1234..."
                  value={formData.paymentInstructions}
                  onChange={(e) => handleChange("paymentInstructions", e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Include your Revolut, bank details, or other payment method
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visibility" className="text-sm">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(v) => handleChange("visibility", v)}
                >
                  <SelectTrigger className="h-11">
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
                className="flex-1 h-11"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="flex-1 h-11" disabled={loading}>
                {loading ? "Creating..." : "Create Game"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
