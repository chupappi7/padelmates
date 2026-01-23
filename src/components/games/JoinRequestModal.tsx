import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CreditCard, Clock, Info } from "lucide-react";

interface JoinRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  userId: string;
  paymentMode: "pay_to_join" | "confirm_first";
  pricePerPlayer: number;
  paymentInstructions: string | null;
  paymentDeadlineHours: number;
  onSuccess: () => void;
}

export function JoinRequestModal({
  open,
  onOpenChange,
  gameId,
  userId,
  paymentMode,
  pricePerPlayer,
  paymentInstructions,
  paymentDeadlineHours,
  onSuccess,
}: JoinRequestModalProps) {
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUploadAndSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = `${userId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload screenshot");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("payment-screenshots")
      .getPublicUrl(fileName);

    await submitRequest(publicUrl);
    setUploading(false);
  };

  const submitRequest = async (screenshotUrl?: string) => {
    setSubmitting(true);

    const { error } = await supabase.from("join_requests").insert({
      game_id: gameId,
      user_id: userId,
      note: note || null,
      payment_screenshot_url: screenshotUrl || null,
      payment_status: paymentMode === "pay_to_join" && screenshotUrl ? "submitted" : "not_required",
    });

    if (error) {
      toast.error("Failed to send join request");
      setSubmitting(false);
      return;
    }

    toast.success(
      paymentMode === "pay_to_join"
        ? "Payment submitted – waiting for host verification"
        : "Request sent – waiting for host approval"
    );
    onOpenChange(false);
    onSuccess();
    setSubmitting(false);
    setNote("");
  };

  const handleSubmitWithoutPayment = () => {
    if (paymentMode === "pay_to_join" && pricePerPlayer > 0) {
      toast.error("Please upload payment proof to join");
      return;
    }
    submitRequest();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Request to Join</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Payment Mode Info */}
          <div className="p-3 rounded-xl bg-muted/50 flex items-start gap-3">
            {paymentMode === "pay_to_join" ? (
              <>
                <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pay to Join</p>
                  <p className="text-xs text-muted-foreground">
                    Upload payment proof to complete your request
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Confirm First, Pay Later</p>
                  <p className="text-xs text-muted-foreground">
                    Payment will be requested {paymentDeadlineHours}h before the game
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Payment Instructions */}
          {pricePerPlayer > 0 && paymentInstructions && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Info className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Payment: €{pricePerPlayer}</p>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {paymentInstructions}
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-sm">Add a note (optional)</Label>
            <Textarea
              placeholder="Introduce yourself to the host..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>

          {/* Upload Screenshot for Pay-to-Join */}
          {paymentMode === "pay_to_join" && pricePerPlayer > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Payment Screenshot</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAndSubmit}
                  className="hidden"
                  id="payment-screenshot"
                  disabled={uploading || submitting}
                />
                <label
                  htmlFor="payment-screenshot"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {uploading ? "Uploading..." : "Click to upload payment proof"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={uploading || submitting}
            >
              Cancel
            </Button>
            {(paymentMode === "confirm_first" || pricePerPlayer === 0) && (
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleSubmitWithoutPayment}
                disabled={uploading || submitting}
              >
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
