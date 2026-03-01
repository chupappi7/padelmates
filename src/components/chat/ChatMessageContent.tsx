import { useNavigate } from "react-router-dom";
import { ChatImageMessage } from "./ChatImageMessage";
import { ExternalLink } from "lucide-react";

interface ChatMessageContentProps {
  message: string;
  isMine: boolean;
}

const GAME_SHARE_REGEX = /^Check out this match: (.+)\n(https?:\/\/.+\/games\/[\w-]+)$/;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function ChatMessageContent({ message, isMine }: ChatMessageContentProps) {
  const navigate = useNavigate();

  if (message.startsWith("[image]")) {
    const src = message.replace("[image]", "");
    return <ChatImageMessage src={src} />;
  }

  // Shared game card
  const gameMatch = message.match(GAME_SHARE_REGEX);
  if (gameMatch) {
    const title = gameMatch[1];
    const url = gameMatch[2];
    const path = new URL(url).pathname;

    return (
      <button
        onClick={() => navigate(path)}
        className="w-full text-left rounded-lg border border-border/50 bg-accent/30 p-3 hover:bg-accent/50 transition-colors"
      >
        <p className="text-xs font-medium text-muted-foreground mb-1">Shared Match</p>
        <p className="text-sm font-semibold line-clamp-2">{title}</p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
          <ExternalLink className="w-3 h-3" />
          View Match
        </div>
      </button>
    );
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
              // Internal links: use navigate
              try {
                const url = new URL(part);
                if (url.origin === window.location.origin) {
                  e.preventDefault();
                  navigate(url.pathname);
                }
              } catch {
                // external link, let default behavior
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
