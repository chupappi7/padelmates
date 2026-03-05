import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatImageMessage } from "./ChatImageMessage";
import { SharedGameCard } from "./SharedGameCard";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatMessageContentProps {
  message: string;
  isMine: boolean;
}

const GAME_TAG_REGEX = /^\[game:([\w-]+)\]$/;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const BANK_DETAILS_PREFIX = "💳 Payment Details:\n";

function BankDetailsMessage({ details, isMine }: { details: string; isMine: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(details);
    setCopied(true);
    toast("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold opacity-70">💳 Payment Details</p>
      <div className="flex items-center gap-2">
        <p className="whitespace-pre-wrap break-words flex-1 font-mono text-[13px]">{details}</p>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 shrink-0 ${isMine ? "hover:bg-primary-foreground/20 text-primary-foreground/70" : "hover:bg-foreground/10 text-muted-foreground"}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function ChatMessageContent({ message, isMine }: ChatMessageContentProps) {
  const navigate = useNavigate();

  if (message.startsWith("[image]")) {
    const src = message.replace("[image]", "");
    return <ChatImageMessage src={src} />;
  }

  // Shared game card
  const gameMatch = message.match(GAME_TAG_REGEX);
  if (gameMatch) {
    const gameId = gameMatch[1];
    return <SharedGameCard gameId={gameId} title="Shared Match" />;
  }

  // Bank details message with copy button
  if (message.startsWith(BANK_DETAILS_PREFIX)) {
    const details = message.slice(BANK_DETAILS_PREFIX.length);
    return <BankDetailsMessage details={details} isMine={isMine} />;
  }

  // Linkify URLs in regular messages
  const parts = message.split(URL_REGEX);
  const hasLinks = parts.length > 1;

  if (!hasLinks) {
    return <p className="whitespace-pre-wrap break-words">{message}</p>;
  }

  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            onClick={(e) => {
              try {
                const url = new URL(part);
                if (url.origin === window.location.origin) {
                  e.preventDefault();
                  navigate(url.pathname);
                }
              } catch {
                // external link
              }
            }}
            className="underline underline-offset-2 text-primary break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}