import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeScrollPicker } from "@/components/games/TimeScrollPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Users, Trophy, Clock, DoorOpen, ShieldCheck, CreditCard, Building2 } from "lucide-react";
import type { HostType } from "@/components/games/HostTypeModal";

const HOST_TYPE_CONFIG: Record<HostType, { title: string; subtitle: string; format: string; defaultMaxPlayers: number; defaultJoinMode: string }> = {
  find_players: {
    title: "Find Players",
    subtitle: "Create a casual match and find players",
    format: "casual_match",
    defaultMaxPlayers: 4,
    defaultJoinMode: "open",
  },
  americano: {
    title: "Host Americano",
    subtitle: "Organize an Americano tournament",
    format: "americano",
    defaultMaxPlayers: 8,
    defaultJoinMode: "request",
  },
  sell_court: {
    title: "Sell / Give Away Court",
    subtitle: "Share or sell your booked court",
    format: "casual_match",
    defaultMaxPlayers: 4,
    defaultJoinMode: "open",
  },
  sell_spots: {
    title: "Find Backup",
    subtitle: "Find a replacement player for your spot",
    format: "casual_match",
    defaultMaxPlayers: 4,
    defaultJoinMode: "open",
  },
};

export default function CreateGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hostType = (searchParams.get("type") as HostType) || "find_players";
  const config = HOST_TYPE_CONFIG[hostType] || HOST_TYPE_CONFIG.find_players;

  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [selectedEndTime, setSelectedEndTime] = useState("20:00");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    courtNumber: "",
    skillLevel: 3,
    maxPlayers: config.defaultMaxPlayers,
    format: config.format,
    visibility: "public",
    hostIsPlaying: hostType !== "sell_court",
    joinMode: config.defaultJoinMode,
    pricePerPlayer: "",
  });

  const isSellCourt = hostType === "sell_court";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a game");
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    const [endHours, endMinutes] = selectedEndTime.split(":").map(Number);
    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    setLoading(true);

    const paymentMode = hostType === "sell_court" ? "court_sharing" 
      : hostType === "sell_spots" ? "spot_selling" 
      : "pay_to_join";

    const title = isSellCourt ? "Sell / Give Away Court" : formData.title;

    const { data, error } = await supabase.from("games").insert({
      title,
      description: formData.description || null,
      location: formData.location,
      court_number: formData.courtNumber || null,
      date_time: dateTime.toISOString(),
      end_date_time: endDateTime.toISOString(),
      skill_level: formData.skillLevel,
      max_players: formData.maxPlayers,
      price_per_player: formData.pricePerPlayer ? parseFloat(formData.pricePerPlayer) : 0,
      payment_mode: paymentMode,
      format: formData.format as "casual_match" | "americano" | "team_americano",
      visibility: formData.visibility as "public" | "private" | "club_only",
      host_id: user.id,
      host_is_playing: isSellCourt ? false : formData.hostIsPlaying,
      join_mode: isSellCourt ? "open" : formData.joinMode,
    }).select().single();

    if (error) {
      toast.error("Failed to create game");
      setLoading(false);
      return;
    }

    toast.success(isSellCourt ? "Court listing created!" : "Game created successfully!");
    navigate(`/games/${data.id}`);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "format") {
        if (value === "casual_match" || value === "court_sharing") {
          updated.maxPlayers = 4;
        } else if (value === "americano" || value === "team_americano") {
          updated.maxPlayers = 8;
        }
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6 md:py-8 max-w-2xl px-4 pb-32 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6 md:mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{config.title}</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {config.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {isSellCourt ? (
              /* ========== SELL / GIVE AWAY COURT — Simplified ========== */
              <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  Court Details
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="location" className="text-sm">Location <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="courtNumber" className="text-sm">Court #</Label>
                    <Input
                      id="courtNumber"
                      placeholder="e.g., 3"
                      value={formData.courtNumber}
                      onChange={(e) => handleChange("courtNumber", e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Date <span className="text-destructive">*</span></Label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
                          {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select date"}
                        </span>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setShowDatePicker(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Start & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Start Time <span className="text-destructive">*</span></Label>
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                    >
                      <span className="text-foreground">{selectedTime}</span>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">End Time <span className="text-destructive">*</span></Label>
                    <button
                      type="button"
                      onClick={() => setShowEndTimePicker(true)}
                      className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                    >
                      <span className="text-foreground">{selectedEndTime}</span>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />
                <TimeScrollPicker open={showEndTimePicker} onOpenChange={setShowEndTimePicker} value={selectedEndTime} onChange={setSelectedEndTime} />

                {/* Price for the court */}
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm">Price for the Court</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={formData.pricePerPlayer}
                      onChange={(e) => handleChange("pricePerPlayer", e.target.value)}
                      className="h-11 pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Leave empty or 0 if giving away for free</p>
                </div>

                {/* Optional note */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm">Note (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Any details about the court booking..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* ========== OTHER HOST TYPES — Full form ========== */}
                {/* Game Details */}
                <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Game Details
                  </h2>

                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm">Game Title <span className="text-destructive">*</span></Label>
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

                  {hostType === "americano" && (
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="format" className="text-sm">Americano Type</Label>
                        <Select
                          value={formData.format}
                          onValueChange={(v) => handleChange("format", v)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="americano">Americano</SelectItem>
                            <SelectItem value="team_americano">Team Americano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="skill" className="text-sm">Min Skill Level</Label>
                        <Select
                          value={String(formData.skillLevel)}
                          onValueChange={(v) => handleChange("skillLevel", parseInt(v))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">Level 2 – Beginner</SelectItem>
                            <SelectItem value="3">Level 3 – Intermediate</SelectItem>
                            <SelectItem value="4">Level 4 – Upper-Int</SelectItem>
                            <SelectItem value="5">Level 5 – Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {hostType !== "americano" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="skill" className="text-sm">Min Skill Level</Label>
                      <Select
                        value={String(formData.skillLevel)}
                        onValueChange={(v) => handleChange("skillLevel", parseInt(v))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">Level 2 – Beginner</SelectItem>
                          <SelectItem value="3">Level 3 – Intermediate</SelectItem>
                          <SelectItem value="4">Level 4 – Upper-Int</SelectItem>
                          <SelectItem value="5">Level 5 – Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* When & Where */}
                <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    When & Where
                  </h2>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="location" className="text-sm">Court / Location <span className="text-destructive">*</span></Label>
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
                      <Label htmlFor="courtNumber" className="text-sm">Court #</Label>
                      <Input
                        id="courtNumber"
                        placeholder="e.g., 3"
                        value={formData.courtNumber}
                        onChange={(e) => handleChange("courtNumber", e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date <span className="text-destructive">*</span></Label>
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                        >
                          <span className={selectedDate ? "text-foreground" : "text-muted-foreground"}>
                            {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select date"}
                          </span>
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setShowDatePicker(false);
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start & End Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Start Time <span className="text-destructive">*</span></Label>
                      <button
                        type="button"
                        onClick={() => setShowTimePicker(true)}
                        className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <span className="text-foreground">{selectedTime}</span>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">End Time <span className="text-destructive">*</span></Label>
                      <button
                        type="button"
                        onClick={() => setShowEndTimePicker(true)}
                        className="w-full h-11 px-3 flex items-center justify-between bg-background border border-input rounded-md text-sm hover:bg-accent transition-colors"
                      >
                        <span className="text-foreground">{selectedEndTime}</span>
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />
                  <TimeScrollPicker open={showEndTimePicker} onOpenChange={setShowEndTimePicker} value={selectedEndTime} onChange={setSelectedEndTime} />

                  {/* Price per Player */}
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-sm">Price per Player</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={formData.pricePerPlayer}
                        onChange={(e) => handleChange("pricePerPlayer", e.target.value)}
                        className="h-11 pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty or 0 for free games</p>
                  </div>
                </div>

                {/* Players & Settings */}
                <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Players & Settings
                  </h2>

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

                  {/* Join Mode Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm">Join Mode</Label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleChange("joinMode", "open")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          formData.joinMode === "open"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <DoorOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Open</p>
                          <p className="text-xs text-muted-foreground">Anyone can join directly</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange("joinMode", "request")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          formData.joinMode === "request"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Request to Join</p>
                          <p className="text-xs text-muted-foreground">You approve each player</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange("joinMode", "request_and_pay")}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          formData.joinMode === "request_and_pay"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Request & Pay</p>
                          <p className="text-xs text-muted-foreground">Players request and pay to confirm</p>
                        </div>
                      </button>
                    </div>
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
              </>
            )}

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
                {loading ? "Creating..." : isSellCourt ? "🏟️ List Court" : "Create Game"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
