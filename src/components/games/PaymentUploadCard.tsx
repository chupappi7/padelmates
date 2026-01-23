import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CreditCard, Clock, Check } from "lucide-react";
import { format } from "date-fns";

interface PaymentUploadCardProps {
  requestId: string;
  userId: string;
  pricePerPlayer: number;
  paymentInstructions: string | null;
  paymentDueAt: string | null;
  onSuccess: () => void;
}

export function PaymentUploadCard({
  requestId,
  userId,
  pricePerPlayer,
  paymentInstructions,
  paymentDueAt,
  onSuccess,
}: PaymentUploadCardProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Update the join request with payment info
    const { error } = await supabase
      .from("join_requests")
      .update({
        payment_screenshot_url: publicUrl,
        payment_status: "submitted",
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update payment status");
      setUploading(false);
      return;
    }

    toast.success("Payment submitted! Waiting for host verification");
    onSuccess();
    setUploading(false);
  };

  return (
    <div className="bg-card border border-warning/20 rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Payment Required</h3>
          {paymentDueAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Due by {format(new Date(paymentDueAt), "EEE, MMM d 'at' h:mm a")}
            </p>
          )}
        </div>
        <span className="text-lg font-bold text-primary">€{pricePerPlayer}</span>
      </div>

      {paymentInstructions && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-xs text-muted-foreground mb-1">Payment details:</p>
          <p className="whitespace-pre-wrap">{paymentInstructions}</p>
        </div>
      )}

      <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
          id="payment-upload"
          disabled={uploading}
        />
        <label
          htmlFor="payment-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Upload payment screenshot"}
          </span>
        </label>
      </div>
    </div>
  );
}
