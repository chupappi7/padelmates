import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatImageMessageProps {
  src: string;
  className?: string;
}

export function ChatImageMessage({ src, className }: ChatImageMessageProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (src.startsWith("http")) {
      setImgUrl(src);
      return;
    }
    supabase.storage
      .from("chat-images")
      .createSignedUrl(src, 3600)
      .then(({ data }) => {
        if (data) setImgUrl(data.signedUrl);
      });
  }, [src]);

  const handleSave = async () => {
    if (!imgUrl) return;
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Image saved");
    } catch {
      toast.error("Failed to save image");
    }
  };

  if (!imgUrl) {
    return (
      <div className="w-48 h-32 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  return (
    <>
      <div className="relative group">
        <img
          src={imgUrl}
          alt="Shared image"
          className={className || "max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"}
          onClick={() => setLightboxOpen(true)}
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-1.5 right-1.5 h-7 px-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
        >
          <Download className="w-3 h-3 mr-1" />
          Save
        </Button>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 text-white hover:bg-white/20 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
          >
            <Download className="w-6 h-6" />
          </Button>
          <img
            src={imgUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
