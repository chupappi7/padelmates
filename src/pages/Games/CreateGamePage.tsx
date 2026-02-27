import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, X as XIcon, Upload, ShieldCheck } from "lucide-react";
import { FriendPickerSheet, type PrefilledPlayer } from "@/components/friends/FriendPickerSheet";
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
import { ArrowLeft, Calendar, MapPin, Users, Trophy, Clock, DoorOpen, CreditCard, Building2 } from "lucide-react";
// UserPlus and XIcon imported at top
import { DurationChips } from "@/components/games/DurationChips";
import { CourtPicker } from "@/components/games/CourtPicker";
import { Switch } from "@/components/ui/switch";
import type { HostType } from "@/components/games/HostTypeModal";

const HOST_TYPE_CONFIG: Record<HostType, { title: string; subtitle: string; format: string; defaultMaxPlayers: number; defaultJoinMode: string; maxPlayerLimit?: number }> = {
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
    defaultJoinMode: "open",
    maxPlayerLimit: 20,
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
  const [bookingScreenshotPath, setBookingScreenshotPath] = useState<string | null>(null);
  const [bookingScreenshotUploading, setBookingScreenshotUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [duration, setDuration] = useState(90);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [prefilledPlayers, setPrefilledPlayers] = useState<PrefilledPlayer[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    courtNumber: "",
    skillLevel: 2,
    maxPlayers: config.defaultMaxPlayers,
    format: config.format,
    visibility: "public",
    hostIsPlaying: hostType !== "sell_court" && hostType !== "sell_spots",
    joinMode: hostType === "sell_spots" ? "open" : config.defaultJoinMode,
    totalPrice: "",
    priceMode: (hostType === "find_players" ? "split_evenly"
             : hostType === "sell_court"  ? "set_price"
             : hostType === "americano"   ? "set_price"
             : "set_price") as "split_evenly" | "free" | "set_price",
  });

  const [allowSubstitutions, setAllowSubstitutions] = useState(false);
  const [gameType, setGameType] = useState<"friendly" | "americano" | "other">("friendly");
  const [customGameType, setCustomGameType] = useState("");

  // Refs for auto-scroll on selection
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollToCard = useCallback((key: string) => {
    setTimeout(() => {
      cardRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

  // Find Players: spotsNeeded is the primary control (how many more players do you need?)
  // Min court size is 4, so minimum spots = max(1, 4 - prefilled - (hostIsPlaying ? 1 : 0))
  const minSpotsNeeded = (hIsPlaying: boolean, pCount: number) =>
    Math.max(0, 4 - pCount - (hIsPlaying ? 1 : 0));

  const [spotsNeeded, setSpotsNeeded] = useState(() => {
    const isAmericano = hostType === "americano";
    const defaultSpots = isAmericano ? 7 : 2; // americano default 8 players total
    return Math.max(minSpotsNeeded(hostType !== "sell_court", 0), defaultSpots);
  });

  const getPlayerName = (p: PrefilledPlayer) => typeof p === "string" ? p : p.name;
  const prefilledCount = prefilledPlayers.filter(p => getPlayerName(p).trim()).length;

  // Derived values for find_players mode
  const currentMin = minSpotsNeeded(formData.hostIsPlaying, prefilledCount);
  const playerLimit = config.maxPlayerLimit || 8;
  const maxSpotsNeeded = Math.max(currentMin, playerLimit - prefilledCount - (formData.hostIsPlaying ? 1 : 0));
  const clampedSpotsNeeded = Math.min(Math.max(spotsNeeded, currentMin), maxSpotsNeeded);

  // effectiveLookingFor = spotsNeeded in find_players/americano, 1 for sell_spots, else legacy lookingFor
  const effectiveLookingFor = hostType === "sell_spots"
    ? 1
    : (hostType === "find_players" || hostType === "americano")
      ? clampedSpotsNeeded
      : Math.max(0, formData.maxPlayers - prefilledPlayers.length - (formData.hostIsPlaying ? 1 : 0));

  // Derived maxPlayers: sell_spots always 1 (backup for 1 player)
  const derivedMaxPlayers = hostType === "sell_spots"
    ? 1
    : (hostType === "find_players" || hostType === "americano")
      ? clampedSpotsNeeded + prefilledCount + (formData.hostIsPlaying ? 1 : 0)
      : formData.maxPlayers;

  const maxPrefilledSlots = (hostType === "find_players" || hostType === "americano")
    ? Math.max(0, clampedSpotsNeeded) // fill all open spots
    : 0;

  const handleSpotsNeededChange = (delta: number) => {
    setSpotsNeeded(prev => {
      const next = Math.min(Math.max(currentMin, prev + delta), maxSpotsNeeded);
      // Trim prefilled if they'd exceed the new available prefilled slots
      const newMaxPrefilled = Math.max(0, next - 1);
      if (prefilledPlayers.length > newMaxPrefilled) {
        setPrefilledPlayers(p => p.slice(0, newMaxPrefilled));
      }
      return next;
    });
  };

  const isSellCourt = hostType === "sell_court";

  const handleBookingScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBookingScreenshotUploading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("booking-proofs").upload(filePath, file);
    if (error) {
      toast.error("Failed to upload screenshot");
    } else {
      setBookingScreenshotPath(filePath);
      toast.success("Screenshot uploaded!");
    }
    setBookingScreenshotUploading(false);
  };

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

    if (formData.joinMode === "request_and_pay" && (!formData.totalPrice || Number(formData.totalPrice) <= 0)) {
      toast.error("Price is required for 'Request & Pay' mode");
      return;
    }

    if (hostType === "sell_spots" && !formData.description.trim()) {
      toast.error("Please describe what kind of match or event this is");
      return;
    }

    if (hostType === "sell_spots" && (!formData.totalPrice || Number(formData.totalPrice) <= 0)) {
      toast.error("Please set a price for the backup spot");
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(dateTime.getTime() + duration * 60 * 1000);

    setLoading(true);

    const paymentMode = hostType === "sell_court" ? "court_sharing" 
      : hostType === "sell_spots" ? "spot_selling" 
      : "pay_to_join";

    const skillLabel = ["D","C","B","A"][formData.skillLevel - 1] ?? formData.skillLevel;
    const title = isSellCourt ? "Sell / Give Away Court" 
      : hostType === "sell_spots" ? "Looking for backup"
      : hostType === "find_players" ? `Looking for ${effectiveLookingFor} player${effectiveLookingFor !== 1 ? 's' : ''} for ${gameType === "friendly" ? "friendly match" : gameType === "americano" ? "americano" : (customGameType.trim() || "match")}`
      : hostType === "americano" ? `Americano · ${skillLabel}`
      : formData.title;

    const { data, error } = await supabase.from("games").insert({
      title,
      description: formData.description || null,
      location: formData.location,
      court_number: formData.courtNumber || null,
      date_time: dateTime.toISOString(),
      end_date_time: endDateTime.toISOString(),
      skill_level: formData.skillLevel,
      max_players: derivedMaxPlayers,
      price_per_player: formData.totalPrice && Number(formData.totalPrice) > 0
        ? isSellCourt
          ? Number(formData.totalPrice)
          : hostType === "americano"
            ? Number(formData.totalPrice)
            : Math.ceil(Number(formData.totalPrice) / derivedMaxPlayers)
        : 0,
      price_mode: formData.priceMode,
      payment_mode: paymentMode,
      format: formData.format as "casual_match" | "americano" | "team_americano",
      visibility: formData.visibility as "public" | "private" | "club_only",
      host_id: user.id,
      host_is_playing: (isSellCourt || hostType === "sell_spots") ? false : formData.hostIsPlaying,
      join_mode: (isSellCourt || hostType === "sell_spots") ? "open" : formData.joinMode,
      prefilled_players: prefilledPlayers.filter(p => getPlayerName(p).trim() !== ""),
      ...(isSellCourt && bookingScreenshotPath ? { booking_screenshot_url: bookingScreenshotPath } : {}),
      ...(hostType === "americano" ? { allow_substitutions: allowSubstitutions } : {}),
    } as any).select().single();

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
                    <Label className="text-sm">Location <span className="text-destructive">*</span></Label>
                    <CourtPicker value={formData.location} onChange={(v) => handleChange("location", v)} />
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

                {/* Start Time & Duration */}
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

                <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />

                <div className="space-y-1.5">
                  <Label className="text-sm">Duration</Label>
                  <DurationChips duration={duration} onDurationChange={setDuration} selectedTime={selectedTime} />
                </div>

                {/* Total Court Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm">Total Court Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={formData.totalPrice}
                      onChange={(e) => handleChange("totalPrice", e.target.value)}
                      className="h-11 pl-10"
                    />
                  </div>
                  {formData.totalPrice && Number(formData.totalPrice) > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Asking price: {Number(formData.totalPrice)} Kč — shown on listing card
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Leave empty or 0 if giving away for free</p>
                  )}
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

                {/* Booking Proof Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Booking Confirmation Screenshot (optional)
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">Email, app screenshot, etc. Helps buyers trust your listing.</p>
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleBookingScreenshotUpload}
                      className="hidden"
                      id="booking-screenshot"
                      disabled={bookingScreenshotUploading}
                    />
                    <label htmlFor="booking-screenshot" className="cursor-pointer flex flex-col items-center gap-2">
                      {bookingScreenshotUploading ? (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-sm text-muted-foreground">Uploading…</span>
                        </>
                      ) : bookingScreenshotPath ? (
                        <>
                          <ShieldCheck className="w-5 h-5 text-success" />
                          <span className="text-sm text-success font-medium">Screenshot uploaded ✓</span>
                          <span className="text-xs text-muted-foreground">Tap to replace</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload screenshot</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {hostType === "sell_spots" ? (
                  /* ========== FIND BACKUP — Simplified flow ========== */
                  <>
                    {/* Card 1: Location & Schedule */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Location & Schedule
                      </h2>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-sm">Court / Location <span className="text-destructive">*</span></Label>
                          <CourtPicker value={formData.location} onChange={(v) => handleChange("location", v)} />
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

                      <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />

                      <div className="space-y-1.5">
                        <Label className="text-sm">Duration</Label>
                        <DurationChips duration={duration} onDurationChange={setDuration} selectedTime={selectedTime} />
                      </div>
                    </div>

                    {/* Card 2: Details (required) */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Details <span className="text-destructive">*</span>
                      </h2>
                      <div className="space-y-1.5">
                        <Textarea
                          id="description"
                          placeholder="Describe the match — e.g. 'Casual doubles, B level, need 1 backup for our regular group'"
                          value={formData.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Card 3: Price (required) */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Price <span className="text-destructive">*</span>
                      </h2>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">How much for the backup spot?</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={formData.totalPrice}
                            onChange={(e) => handleChange("totalPrice", e.target.value)}
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : hostType === "find_players" ? (
                  /* ========== FIND PLAYERS — 5-card flow ========== */
                  <>
                    {/* Card 0: Type of Game */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Type of Game <span className="text-destructive">*</span>
                      </h2>
                      <div className="flex gap-2">
                        {([
                          { value: "friendly" as const, label: "Friendly Match" },
                          { value: "americano" as const, label: "Americano" },
                          { value: "other" as const, label: "Other" },
                        ]).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setGameType(opt.value); if (opt.value !== "other") scrollToCard("fp-location"); }}
                            className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${
                              gameType === opt.value
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {gameType === "other" && (
                        <Input
                          placeholder="e.g., Training, Team Americano..."
                          value={customGameType}
                          onChange={(e) => setCustomGameType(e.target.value)}
                          className="h-11"
                        />
                      )}
                    </div>

                    {/* Card 1: Location & Schedule */}
                    <div ref={(el) => { cardRefs.current["fp-location"] = el; }} className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Location & Schedule
                      </h2>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-sm">Court / Location <span className="text-destructive">*</span></Label>
                          <CourtPicker value={formData.location} onChange={(v) => handleChange("location", v)} />
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

                      <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />

                      <div className="space-y-1.5">
                        <Label className="text-sm">Duration</Label>
                        <DurationChips duration={duration} onDurationChange={setDuration} selectedTime={selectedTime} />
                      </div>
                    </div>

                    {/* Card 2: Players Setup */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Players
                      </h2>

                      {/* Section A: Are you playing? */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Are you playing?</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("hostIsPlaying", true);
                              setSpotsNeeded(prev => Math.max(minSpotsNeeded(true, prefilledCount), prev));
                            }}
                            className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${
                              formData.hostIsPlaying
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            I'm playing
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("hostIsPlaying", false);
                              setSpotsNeeded(prev => Math.max(minSpotsNeeded(false, prefilledCount), prev));
                            }}
                            className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${
                              !formData.hostIsPlaying
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            I'm organizing
                          </button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border" />

                      {/* Section B: Confirmed players */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                          Players already confirmed
                        </Label>
                        {formData.hostIsPlaying && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            <span className="text-sm flex-1 truncate px-1 font-medium">You (host)</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Playing</span>
                          </div>
                        )}
                        {prefilledPlayers.map((player, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg">
                            <span className="text-sm flex-1 truncate px-1">
                              {typeof player === "object" ? player.name : player || "Guest"}
                            </span>
                            {typeof player === "object" && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Friend</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPrefilledPlayers(prev => prev.filter((_, i) => i !== index))}
                              className="w-7 h-7 rounded-md bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
                            >
                              <XIcon className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                        {prefilledPlayers.length < maxPrefilledSlots && (
                          <button
                            type="button"
                            onClick={() => setShowPlayerPicker(true)}
                            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add player
                          </button>
                        )}
                      </div>

                      <FriendPickerSheet
                        open={showPlayerPicker}
                        onOpenChange={setShowPlayerPicker}
                        selected={prefilledPlayers}
                        onSelect={(newPlayers) => {
                          const added = newPlayers.length - prefilledPlayers.length;
                          if (added > 0) {
                            const newPrefilledCount = newPlayers.filter(p => (typeof p === "string" ? p : p.name).trim()).length;
                            const newMin = Math.max(1, 4 - newPrefilledCount - (formData.hostIsPlaying ? 1 : 0));
                            setSpotsNeeded(prev => Math.max(newMin, prev - added));
                          }
                          setPrefilledPlayers(newPlayers);
                        }}
                        maxSlots={maxPrefilledSlots}
                      />

                      {/* Divider */}
                      <div className="h-px bg-border" />

                      {/* Section C: Spots needed stepper */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">How many more players do you need? <span className="text-destructive">*</span></Label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleSpotsNeededChange(-1)}
                            disabled={clampedSpotsNeeded <= currentMin}
                            className="w-12 h-12 rounded-xl border-2 border-border bg-background text-xl font-bold flex items-center justify-center transition-all hover:border-primary/60 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                          >
                            –
                          </button>
                          <div className="flex-1 flex flex-col items-center">
                            <span className="text-4xl font-bold text-foreground leading-none">{clampedSpotsNeeded}</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              {clampedSpotsNeeded === 1 ? "player" : "players"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSpotsNeededChange(1)}
                            disabled={clampedSpotsNeeded >= maxSpotsNeeded}
                            className="w-12 h-12 rounded-xl border-2 border-border bg-background text-xl font-bold flex items-center justify-center transition-all hover:border-primary/60 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                          >
                            +
                          </button>
                        </div>

                        {/* Section D: Composition summary */}
                        <div className="bg-muted/40 rounded-xl px-4 py-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                            {formData.hostIsPlaying && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                You
                              </span>
                            )}
                            {formData.hostIsPlaying && prefilledCount > 0 && <span>·</span>}
                            {prefilledCount > 0 && (
                              <span>{prefilledCount} confirmed</span>
                            )}
                            {(formData.hostIsPlaying || prefilledCount > 0) && <span>·</span>}
                            <span className="font-medium text-foreground">{clampedSpotsNeeded} spot{clampedSpotsNeeded !== 1 ? "s" : ""} open</span>
                            <span>·</span>
                            <span className="font-medium text-foreground">{derivedMaxPlayers} total</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Court total: <strong>{derivedMaxPlayers}</strong> player{derivedMaxPlayers !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Skill Level */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Skill Level
                      </h2>
                      <div className="space-y-1.5">
                        <Label htmlFor="skill" className="text-sm">Skill Level</Label>
                        <Select
                          value={String(formData.skillLevel)}
                          onValueChange={(v) => handleChange("skillLevel", parseInt(v))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="4">A</SelectItem>
                            <SelectItem value="3">B</SelectItem>
                            <SelectItem value="2">C</SelectItem>
                            <SelectItem value="1">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Card 4: How to Join */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        How to Join
                      </h2>

                      {/* Join Mode */}
                      <div className="space-y-2">
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

                      {/* Price — directly under join mode */}
                      <div className="space-y-3">
                        <Label className="text-sm">Price</Label>
                        <div className="flex gap-2">
                          {([
                            { value: "split_evenly", label: "Split evenly", emoji: "🤝" },
                            { value: "free", label: "Free", emoji: "🆓" },
                            { value: "set_price", label: "Set price", emoji: "💰" },
                          ] as const).map((mode) => (
                            <button
                              key={mode.value}
                              type="button"
                              onClick={() => handleChange("priceMode", mode.value)}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                                formData.priceMode === mode.value
                                  ? "border-primary bg-primary/5 text-foreground"
                                  : "border-border hover:border-primary/50 text-muted-foreground"
                              }`}
                            >
                              <span>{mode.emoji}</span>
                              <span>{mode.label}</span>
                            </button>
                          ))}
                        </div>

                        {formData.priceMode === "split_evenly" && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Players will split the court cost evenly</p>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Total Court Price (optional)</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={formData.totalPrice}
                                  onChange={(e) => handleChange("totalPrice", e.target.value)}
                                  className="h-11 pl-10"
                                />
                              </div>
                              {formData.totalPrice && Number(formData.totalPrice) > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  ≈ {Math.ceil(Number(formData.totalPrice) / derivedMaxPlayers)} Kč per player
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {formData.priceMode === "set_price" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Total Amount</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="0"
                                  value={formData.totalPrice}
                                  onChange={(e) => handleChange("totalPrice", e.target.value)}
                                  className="h-11 pl-10"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Per Player</Label>
                              <div className="h-11 px-3 flex items-center bg-muted/50 border border-input rounded-md text-sm font-semibold">
                                {formData.totalPrice && Number(formData.totalPrice) > 0
                                  ? `${Math.ceil(Number(formData.totalPrice) / derivedMaxPlayers)} Kč`
                                  : "Free"}
                              </div>
                            </div>
                            <p className="col-span-2 text-xs text-muted-foreground">Enter the total court cost — it'll be split across {derivedMaxPlayers} players</p>
                          </div>
                        )}
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

                    {/* Card 5: About This Game (optional) */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        About This Game
                        <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                      </h2>
                      <div className="space-y-1.5">
                        <Textarea
                          id="description"
                          placeholder="Tell players what to expect, any house rules, parking info..."
                          value={formData.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  </>
                ) : hostType === "americano" ? (
                  /* ========== AMERICANO — Same card-style as Find Players ========== */
                  <>
                    {/* Card 1: Location & Schedule */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Location & Schedule
                      </h2>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-sm">Court / Location <span className="text-destructive">*</span></Label>
                          <CourtPicker value={formData.location} onChange={(v) => handleChange("location", v)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Court #</Label>
                          <Input
                            placeholder="e.g., 3"
                            value={formData.courtNumber}
                            onChange={(e) => handleChange("courtNumber", e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>

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
                              onSelect={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

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

                      <TimeScrollPicker open={showTimePicker} onOpenChange={setShowTimePicker} value={selectedTime} onChange={setSelectedTime} />

                      <div className="space-y-1.5">
                        <Label className="text-sm">Duration</Label>
                        <DurationChips duration={duration} onDurationChange={setDuration} selectedTime={selectedTime} />
                      </div>
                    </div>

                    {/* Card 2: Players */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Players
                      </h2>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Are you playing?</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { handleChange("hostIsPlaying", true); setSpotsNeeded(prev => Math.max(minSpotsNeeded(true, prefilledCount), prev)); }}
                            className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${formData.hostIsPlaying ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                          >
                            I'm playing
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleChange("hostIsPlaying", false); setSpotsNeeded(prev => Math.max(minSpotsNeeded(false, prefilledCount), prev)); }}
                            className={`flex-1 h-10 rounded-xl border-2 text-sm font-medium transition-all ${!formData.hostIsPlaying ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                          >
                            I'm organizing
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                          Players already confirmed
                        </Label>
                        {formData.hostIsPlaying && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            <span className="text-sm flex-1 truncate px-1 font-medium">You (host)</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Playing</span>
                          </div>
                        )}
                        {prefilledPlayers.map((player, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 border border-border rounded-lg">
                            <span className="text-sm flex-1 truncate px-1">
                              {typeof player === "object" ? player.name : player || "Guest"}
                            </span>
                            {typeof player === "object" && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Friend</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPrefilledPlayers(prev => prev.filter((_, i) => i !== index))}
                              className="w-7 h-7 rounded-md bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0"
                            >
                              <XIcon className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        ))}
                        {prefilledPlayers.length < maxPrefilledSlots && (
                          <button
                            type="button"
                            onClick={() => setShowPlayerPicker(true)}
                            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add player
                          </button>
                        )}
                      </div>

                      <FriendPickerSheet
                        open={showPlayerPicker}
                        onOpenChange={setShowPlayerPicker}
                        selected={prefilledPlayers}
                        onSelect={(newPlayers) => {
                          const added = newPlayers.length - prefilledPlayers.length;
                          if (added > 0) {
                            const newPrefilledCount = newPlayers.filter(p => (typeof p === "string" ? p : p.name).trim()).length;
                            const newMin = Math.max(1, 4 - newPrefilledCount - (formData.hostIsPlaying ? 1 : 0));
                            setSpotsNeeded(prev => Math.max(newMin, prev - added));
                          }
                          setPrefilledPlayers(newPlayers);
                        }}
                        maxSlots={maxPrefilledSlots}
                      />

                      <div className="h-px bg-border" />

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">How many players? <span className="text-destructive">*</span></Label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleSpotsNeededChange(-1)}
                            disabled={clampedSpotsNeeded <= currentMin}
                            className="w-12 h-12 rounded-xl border-2 border-border bg-background text-xl font-bold flex items-center justify-center transition-all hover:border-primary/60 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                          >–</button>
                          <div className="flex-1 flex flex-col items-center">
                            <span className="text-4xl font-bold text-foreground leading-none">{clampedSpotsNeeded}</span>
                            <span className="text-xs text-muted-foreground mt-1">{clampedSpotsNeeded === 1 ? "player" : "players"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSpotsNeededChange(1)}
                            disabled={clampedSpotsNeeded >= maxSpotsNeeded}
                            className="w-12 h-12 rounded-xl border-2 border-border bg-background text-xl font-bold flex items-center justify-center transition-all hover:border-primary/60 disabled:opacity-30 disabled:cursor-not-allowed select-none"
                          >+</button>
                        </div>

                        <div className="bg-muted/40 rounded-xl px-4 py-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                            {formData.hostIsPlaying && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                You
                              </span>
                            )}
                            {formData.hostIsPlaying && prefilledCount > 0 && <span>·</span>}
                            {prefilledCount > 0 && <span>{prefilledCount} confirmed</span>}
                            {(formData.hostIsPlaying || prefilledCount > 0) && <span>·</span>}
                            <span className="font-medium text-foreground">{clampedSpotsNeeded} spot{clampedSpotsNeeded !== 1 ? "s" : ""} open</span>
                            <span>·</span>
                            <span className="font-medium text-foreground">{derivedMaxPlayers} total</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Tournament total: <strong>{derivedMaxPlayers}</strong> players
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Substitutions */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                            🔄 Substitutions
                          </h2>
                          <p className="text-xs text-muted-foreground">Allow players to join as substitutes when all spots are filled</p>
                        </div>
                        <Switch
                          checked={allowSubstitutions}
                          onCheckedChange={setAllowSubstitutions}
                          className="shrink-0 scale-100"
                        />
                      </div>
                    </div>

                    {/* Card 4: Skill Level */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Skill Level
                      </h2>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { value: 4, label: "A", colorClass: "badge-skill-a" },
                          { value: 3, label: "B", colorClass: "badge-skill-b" },
                          { value: 2, label: "C", colorClass: "badge-skill-c" },
                          { value: 1, label: "D", colorClass: "badge-skill-d" },
                        ].map((lvl) => (
                          <button
                            key={lvl.value}
                            type="button"
                            onClick={() => handleChange("skillLevel", lvl.value)}
                            className={`h-14 rounded-xl border-2 font-black text-xl transition-all ${
                              formData.skillLevel === lvl.value
                                ? `border-primary ${lvl.colorClass}`
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {lvl.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Title: <strong>Americano · {["D","C","B","A"][formData.skillLevel - 1]}</strong>
                      </p>
                    </div>

                    {/* Card 4: How to Join + Price */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <DoorOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        How to Join
                      </h2>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleChange("joinMode", "open")}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${formData.joinMode === "open" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
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
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${formData.joinMode === "request" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Request to Join</p>
                            <p className="text-xs text-muted-foreground">You approve each player</p>
                          </div>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Price per Player <span className="text-destructive">*</span></Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">Kč</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g., 200"
                            value={formData.totalPrice}
                            onChange={(e) => handleChange("totalPrice", e.target.value)}
                            className="h-11 pl-10"
                          />
                        </div>
                        {formData.totalPrice && Number(formData.totalPrice) > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {Number(formData.totalPrice)} Kč × {derivedMaxPlayers} players = {Number(formData.totalPrice) * derivedMaxPlayers} Kč total
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Set the entry fee each player pays</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Visibility</Label>
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

                    {/* Card 6: About (optional) */}
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                        About This Tournament
                        <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
                      </h2>
                      <Textarea
                        placeholder="Format details, house rules, prizes..."
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                  </>
                ) : (
                  /* ========== SELL SPOTS / other ========== */
                  <>
                    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                      <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        Game Details
                      </h2>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Game Title <span className="text-destructive">*</span></Label>
                        <Input
                          placeholder="e.g., Friday Night Padel"
                          value={formData.title}
                          onChange={(e) => handleChange("title", e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Description (optional)</Label>
                        <Textarea
                          placeholder="Tell players what to expect..."
                          value={formData.description}
                          onChange={(e) => handleChange("description", e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}
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
                {loading ? "Creating..." : isSellCourt ? "🏟️ List Court" : hostType === "americano" ? "🏆 Create Tournament" : "Create Listing"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
