import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Upload, ImageOff, ExternalLink, RefreshCw } from "lucide-react";

interface BookingProofTabProps {
  gameId: string;
  bookingScreenshotUrl: string | null;
  isHost: boolean;
  userId: string | undefined;
  onScreenshotUpdated: (newPath: string) => void;
}

export function BookingProofTab({
  gameId,
  bookingScreenshotUrl,
  isHost,
  userId,
  onScreenshotUpdated,
}: BookingProofTabProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (bookingScreenshotUrl) {
      fetchSignedUrl(bookingScreenshotUrl);
    } else {
      setSignedUrl(null);
    }
  }, [bookingScreenshotUrl]);

  const fetchSignedUrl = async (path: string) => {
    setLoadingUrl(true);
    const { data, error } = await supabase.storage
      .from("booking-proofs")
      .createSignedUrl(path, 3600);
    if (error) {
      toast.error("Failed to load proof image");
    } else {
      setSignedUrl(data.signedUrl);
    }
    setLoadingUrl(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const filePath = `${userId}/${Date.now()}-${file.name}`;

    // Delete old file if exists
    if (bookingScreenshotUrl) {
      await supabase.storage.from("booking-proofs").remove([bookingScreenshotUrl]);
    }

    const { error: uploadError } = await supabase.storage
      .from("booking-proofs")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload screenshot");
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("games")
      .update({ booking_screenshot_url: filePath } as any)
      .eq("id", gameId);

    if (updateError) {
      toast.error("Failed to save screenshot reference");
      setUploading(false);
      return;
    }

    toast.success("Booking proof uploaded!");
    onScreenshotUpdated(filePath);
    fetchSignedUrl(filePath);
    setUploading(false);
  };

  const hasProof = !!bookingScreenshotUrl;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Booking Verification</h2>
            <p className="text-xs text-muted-foreground">
              Host's booking confirmation screenshot
            </p>
          </div>
          {hasProof && (
            <Badge className="ml-auto rounded-full bg-success/10 text-success border-success/20 text-[10px] h-5 gap-1">
              <ShieldCheck className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Screenshot Display */}
      {loadingUrl ? (
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading proof…</p>
        </div>
      ) : signedUrl ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Booking Confirmation</p>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View full size
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="p-3">
            <img
              src={signedUrl}
              alt="Booking confirmation screenshot"
              className="w-full rounded-lg object-contain max-h-[60vh]"
            />
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <ImageOff className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No booking proof yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHost
                ? "Upload a screenshot of your booking confirmation so buyers can trust this listing."
                : "The host hasn't uploaded a booking confirmation yet."}
            </p>
          </div>
        </div>
      )}

      {/* Host Upload / Replace Controls */}
      {isHost && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {hasProof ? "Replace Screenshot" : "Upload Proof"}
          </p>
          <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
            <Input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
              id="booking-proof-upload"
              disabled={uploading}
            />
            <label
              htmlFor="booking-proof-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                  <span className="text-sm text-muted-foreground">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {hasProof ? "Upload new screenshot to replace" : "Upload booking screenshot"}
                  </span>
                  <span className="text-xs text-muted-foreground/60">Email, app screenshot, etc.</span>
                </>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
