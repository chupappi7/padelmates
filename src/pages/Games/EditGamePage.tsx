import { useState, useEffect } from "react";
import { UserPlus, X as XIcon, Upload, ShieldCheck, Building2 } from "lucide-react";
import { FriendPickerSheet, type PrefilledPlayer } from "@/components/friends/FriendPickerSheet";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Calendar, MapPin, Users, Trophy, Clock, DoorOpen, CreditCard } from "lucide-react";
import { DurationChips, snapToDuration } from "@/components/games/DurationChips";

export default function EditGamePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("18:00");
  const [duration, setDuration] = useState(90);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [prefilledPlayers, setPrefilledPlayers] = useState<PrefilledPlayer[]>([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [bookingScreenshotPath, setBookingScreenshotPath] = useState<string | null>(null);
  const [bookingScreenshotUploading, setBookingScreenshotUploading] = useState(false);

  // Detected game type from payment_mode
  const [paymentMode, setPaymentMode] = useState<string>("pay_to_join");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    courtNumber: "",
    skillLevel: 3,
    maxPlayers: 4,
    format: "casual_match",
    visibility: "public",
    hostIsPlaying: true,
    joinMode: "open",
    totalPrice: "",
    priceMode: "free" as "split_evenly" | "free" | "set_price",
  });

  const isSellCourt = paymentMode === "court_sharing";
  const isFindPlayers = paymentMode === "pay_to_join" && formData.format === "casual_match";

  const getPlayerName = (p: PrefilledPlayer) => typeof p === "string" ? p : p.name;
  const prefilledCount = prefilledPlayers.filter(p => getPlayerName(p).trim()).length;

  const effectiveLookingFor = isFindPlayers
    ? Math.max(0, formData.maxPlayers - prefilledPlayers.length - (formData.hostIsPlaying ? 1 : 0))
    : formData.maxPlayers;

  const maxPrefilledSlots = isFindPlayers
    ? Math.max(0, formData.maxPlayers - (formData.hostIsPlaying ? 1 : 0) - 1)
    : 0;

  useEffect(() => {
    if (id) fetchGame();
  }, [id]);

  const fetchGame = async () => {
    const { data, error } = await supabase.from("games").select("*").eq("id", id).single();
    if (error || !data) {
      toast.error("Game not found");
      navigate("/");
      return;
    }

    const dt = new Date(data.date_time);
    setSelectedDate(dt);
    setSelectedTime(`${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`);
    if (data.end_date_time) {
      const edt = new Date(data.end_date_time);
      const diffMin = Math.round((edt.getTime() - dt.getTime()) / 60000);
      setDuration(snapToDuration(diffMin));
    }

    const pm = (data as any).payment_mode || "pay_to_join";
    setPaymentMode(pm);

    // Reconstruct totalPrice from price_per_player
    const priceMode = (data as any).price_mode || "free";
    let totalPrice = "";
    if (data.price_per_player > 0) {
      // For court_sharing the price IS the full price, for others it's per-player so multiply back
      totalPrice = pm === "court_sharing"
        ? String(data.price_per_player)
        : String(data.price_per_player * data.max_players);
    }

    setFormData({
      title: data.title,
      description: data.description || "",
      location: data.location,
      courtNumber: data.court_number || "",
      skillLevel: data.skill_level as number,
      maxPlayers: data.max_players,
      format: data.format,
      visibility: data.visibility,
      hostIsPlaying: data.host_is_playing,
      joinMode: data.join_mode,
      totalPrice,
      priceMode,
    });

    if ((data as any).booking_screenshot_url) {
      setBookingScreenshotPath((data as any).booking_screenshot_url);
    }
    setPrefilledPlayers(Array.isArray((data as any).prefilled_players) ? (data as any).prefilled_players : []);
    setFetching(false);
  };

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
    if (!user || !id) return;
    if (!selectedDate) { toast.error("Please select a date"); return; }
    if (formData.joinMode === "request_and_pay" && (!formData.totalPrice || Number(formData.totalPrice) <= 0)) {
      toast.error("Price is required for 'Request & Pay' mode"); return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(dateTime.getTime() + duration * 60 * 1000);

    setLoading(true);

    const price_per_player = formData.totalPrice && Number(formData.totalPrice) > 0
      ? isSellCourt
        ? Number(formData.totalPrice)
        : Math.ceil(Number(formData.totalPrice) / formData.maxPlayers)
      : 0;

    const { error } = await supabase.from("games").update({
      title: isSellCourt ? "Sell / Give Away Court" : formData.title,
      description: formData.description || null,
      location: formData.location,
      court_number: formData.courtNumber || null,
      date_time: dateTime.toISOString(),
      end_date_time: endDateTime.toISOString(),
      skill_level: formData.skillLevel,
      max_players: formData.maxPlayers,
      price_per_player,
      price_mode: formData.priceMode,
      format: formData.format as "casual_match" | "americano" | "team_americano",
      visibility: formData.visibility as "public" | "private" | "club_only",
      host_is_playing: isSellCourt ? false : formData.hostIsPlaying,
      join_mode: isSellCourt ? "open" : formData.joinMode,
      prefilled_players: prefilledPlayers.filter(p => {
        const name = typeof p === "string" ? p : p.name;
        return name.trim() !== "";
      }),
      ...(isSellCourt && bookingScreenshotPath ? { booking_screenshot_url: bookingScreenshotPath } : {}),
    } as any).eq("id", id);

    if (error) {
      toast.error("Failed to update game");
      setLoading(false);
      return;
    }
    toast.success(isSellCourt ? "Court listing updated!" : "Game updated!");
    navigate(`/games/${id}`);
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "format") {
        if (value === "casual_match" || value === "court_sharing") updated.maxPlayers = 4;
        else if (value === "americano" || value === "team_americano") updated.maxPlayers = 8;
      }
      return updated;
    });
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              {isSellCourt ? "Edit Court Listing" : "Edit Game"}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {isSellCourt ? "Update your court listing details" : "Update your game details"}
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
                        onSelect={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Start Time */}
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
                {/* ========== MATCH / AMERICANO — Full form ========== */}

                {/* Game Details */}
                <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Game Details
                  </h2>

                  {isFindPlayers ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Total players <span className="text-destructive">*</span></Label>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Looking for</span>
                          <span className="h-11 w-24 flex items-center justify-center bg-muted/50 border border-input rounded-md text-sm font-semibold">
                            {effectiveLookingFor}
                          </span>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">out of</span>
                          <Select
                            value={String(formData.maxPlayers)}
                            onValueChange={(v) => {
                              handleChange("maxPlayers", parseInt(v));
                              const newMax = parseInt(v);
                              const maxPrefilled = Math.max(0, newMax - (formData.hostIsPlaying ? 1 : 0) - 1);
                              if (prefilledPlayers.length > maxPrefilled) {
                                setPrefilledPlayers(prev => prev.slice(0, maxPrefilled));
                              }
                            }}
                          >
                            <SelectTrigger className="h-11 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground">total</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formData.hostIsPlaying ? "You" : ""}
                          {formData.hostIsPlaying && prefilledCount > 0 ? " + " : ""}
                          {prefilledCount > 0 ? `${prefilledCount} player${prefilledCount !== 1 ? "s" : ""}` : ""}
                          {(formData.hostIsPlaying || prefilledCount > 0) ? " already in · " : ""}
                          {effectiveLookingFor} spot{effectiveLookingFor !== 1 ? "s" : ""} open
                        </p>
                      </div>

                      {/* Pre-filled players */}
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                          Players already joining
                        </Label>
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
                        onSelect={setPrefilledPlayers}
                        maxSlots={maxPrefilledSlots}
                      />
                    </div>
                  ) : (
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
                  )}

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

                  {formData.format === "americano" || formData.format === "team_americano" ? (
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Americano Type</Label>
                        <Select value={formData.format} onValueChange={(v) => handleChange("format", v)}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="americano">Americano</SelectItem>
                            <SelectItem value="team_americano">Team Americano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Min Skill Level</Label>
                        <Select value={String(formData.skillLevel)} onValueChange={(v) => handleChange("skillLevel", parseInt(v))}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">D  – Absolute Beginner</SelectItem>
                            <SelectItem value="2">C− – Beginner</SelectItem>
                            <SelectItem value="3">C+ – Casual</SelectItem>
                            <SelectItem value="4">B− – Intermediate</SelectItem>
                            <SelectItem value="5">B+ – Upper-Int</SelectItem>
                            <SelectItem value="6">A− – Advanced</SelectItem>
                            <SelectItem value="7">A+ – Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Min Skill Level</Label>
                      <Select value={String(formData.skillLevel)} onValueChange={(v) => handleChange("skillLevel", parseInt(v))}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">D  – Absolute Beginner</SelectItem>
                          <SelectItem value="2">C− – Beginner</SelectItem>
                          <SelectItem value="3">C+ – Casual</SelectItem>
                          <SelectItem value="4">B− – Intermediate</SelectItem>
                          <SelectItem value="5">B+ – Upper-Int</SelectItem>
                          <SelectItem value="6">A− – Advanced</SelectItem>
                          <SelectItem value="7">A+ – Pro</SelectItem>
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
                          onSelect={(date) => { setSelectedDate(date); setShowDatePicker(false); }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start Time */}
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

                  {/* Price Mode */}
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
                              ≈ {Math.ceil(Number(formData.totalPrice) / formData.maxPlayers)} Kč per player
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
                              ? `${Math.ceil(Number(formData.totalPrice) / formData.maxPlayers)} Kč`
                              : "Free"}
                          </div>
                        </div>
                        <p className="col-span-2 text-xs text-muted-foreground">
                          Enter the total court cost — it'll be split across {formData.maxPlayers} players
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Players & Settings */}
                <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                  <h2 className="font-display font-bold text-base md:text-lg flex items-center gap-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Players & Settings
                  </h2>

                  {!isFindPlayers && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Max Players</Label>
                      <Select value={String(formData.maxPlayers)} onValueChange={(v) => handleChange("maxPlayers", parseInt(v))}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 players</SelectItem>
                          <SelectItem value="8">8 players</SelectItem>
                          <SelectItem value="12">12 players</SelectItem>
                          <SelectItem value="16">16 players</SelectItem>
                          <SelectItem value="20">20 players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Pre-filled players (non find_players modes) */}
                  {!isFindPlayers && (
                    <div className="space-y-2">
                      <Label className="text-sm flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-primary" />
                        Players already joining
                      </Label>
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
                      {prefilledPlayers.length < Math.max(0, formData.maxPlayers - (formData.hostIsPlaying ? 1 : 0) - 1) && (
                        <button
                          type="button"
                          onClick={() => setShowPlayerPicker(true)}
                          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add player
                        </button>
                      )}
                      <FriendPickerSheet
                        open={showPlayerPicker}
                        onOpenChange={setShowPlayerPicker}
                        selected={prefilledPlayers}
                        onSelect={setPrefilledPlayers}
                        maxSlots={Math.max(0, formData.maxPlayers - (formData.hostIsPlaying ? 1 : 0) - 1)}
                      />
                    </div>
                  )}

                  {/* Host Role */}
                  <div className="space-y-2">
                    <Label className="text-sm">Your Role</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => handleChange("hostIsPlaying", true)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${formData.hostIsPlaying ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div><p className="font-medium text-sm">🎾 Playing</p><p className="text-xs text-muted-foreground">I'm joining the game</p></div>
                      </button>
                      <button type="button" onClick={() => handleChange("hostIsPlaying", false)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${!formData.hostIsPlaying ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div><p className="font-medium text-sm">📋 Organizer</p><p className="text-xs text-muted-foreground">Just organizing</p></div>
                      </button>
                    </div>
                  </div>

                  {/* Join Mode */}
                  <div className="space-y-2">
                    <Label className="text-sm">Join Mode</Label>
                    <div className="space-y-2">
                      {[
                        { value: "open", icon: DoorOpen, label: "Open", desc: "Anyone can join directly" },
                        { value: "request", icon: ShieldCheck, label: "Request to Join", desc: "You approve each player" },
                        { value: "request_and_pay", icon: CreditCard, label: "Request & Pay", desc: "Players request and pay to confirm" },
                      ].map((mode) => (
                        <button key={mode.value} type="button" onClick={() => handleChange("joinMode", mode.value)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${formData.joinMode === mode.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <mode.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div><p className="font-medium text-sm">{mode.label}</p><p className="text-xs text-muted-foreground">{mode.desc}</p></div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Visibility</Label>
                    <Select value={formData.visibility} onValueChange={(v) => handleChange("visibility", v)}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
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
              <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="flex-1 h-11" disabled={loading}>
                {loading ? "Saving..." : isSellCourt ? "🏟️ Update Listing" : "Save Changes"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
