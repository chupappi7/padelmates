import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface QuickPhrase {
  label: string;
  message?: string;
  action?: () => void;
  variant?: "default" | "destructive";
}

interface ChatInputWithUploadProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onImageSent: (storagePath: string) => void;
  disabled?: boolean;
  placeholder?: string;
  userId?: string;
  quickPhrases?: QuickPhrase[];
  onQuickPhrase?: (message: string) => void;
}

export function ChatInputWithUpload({
  value,
  onChange,
  onSend,
  onImageSent,
  disabled,
  placeholder = "Message...",
  userId,
  quickPhrases = [],
  onQuickPhrase,
}: ChatInputWithUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only images are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-images")
      .upload(filePath, file);

    if (error) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    onImageSent(filePath);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleChipClick = (phrase: QuickPhrase) => {
    if (phrase.action) {
      phrase.action();
    } else if (phrase.message && onQuickPhrase) {
      onQuickPhrase(phrase.message);
    }
  };

  return (
    <div className="space-y-2">
      {quickPhrases.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {quickPhrases.map((phrase) => (
            <button
              key={phrase.label}
              onClick={() => handleChipClick(phrase)}
              disabled={disabled}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors disabled:opacity-50",
                phrase.variant === "destructive"
                  ? "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              {phrase.label}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-11 w-11 rounded-full bg-muted/50 flex items-center justify-center shrink-0 hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        </button>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={uploading ? "Uploading..." : placeholder}
          className="flex-1 rounded-full bg-muted/50 border-0 focus-visible:ring-1 h-11 text-base"
          disabled={uploading}
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 rounded-full shrink-0"
          disabled={!value.trim() || disabled || uploading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
