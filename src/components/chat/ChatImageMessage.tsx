import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatImageMessageProps {
  src: string;
  className?: string;
}

export function ChatImageMessage({ src, className }: ChatImageMessageProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    // If it's already a full URL, use directly
    if (src.startsWith("http")) {
      setImgUrl(src);
      return;
    }
    // Otherwise treat as storage path in chat-images bucket
    supabase.storage
      .from("chat-images")
      .createSignedUrl(src, 3600)
      .then(({ data }) => {
        if (data) setImgUrl(data.signedUrl);
      });
  }, [src]);

  if (!imgUrl) {
    return (
      <div className="w-48 h-32 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  return (
    <img
      src={imgUrl}
      alt="Shared image"
      className={className || "max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"}
      onClick={() => window.open(imgUrl, "_blank")}
    />
  );
}

