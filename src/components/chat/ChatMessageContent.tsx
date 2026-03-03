import { useNavigate } from "react-router-dom";
import { ChatImageMessage } from "./ChatImageMessage";
import { SharedGameCard } from "./SharedGameCard";

interface ChatMessageContentProps {
  message: string;
  isMine: boolean;
}

const GAME_TAG_REGEX = /^\[game:([\w-]+)\]$/;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

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
