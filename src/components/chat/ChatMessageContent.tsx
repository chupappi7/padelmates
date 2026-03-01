import { useNavigate } from "react-router-dom";
import { ChatImageMessage } from "./ChatImageMessage";
import { SharedGameCard } from "./SharedGameCard";

interface ChatMessageContentProps {
  message: string;
  isMine: boolean;
}

const GAME_SHARE_REGEX = /^Check out this match: (.+)\n(https?:\/\/.+\/games\/([\w-]+))$/;
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
    const gameId = gameMatch[3];
    return <SharedGameCard gameId={gameId} title={title} />;
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
