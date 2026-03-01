import { ChatImageMessage } from "./ChatImageMessage";

interface ChatMessageContentProps {
  message: string;
  isMine: boolean;
}

export function ChatMessageContent({ message, isMine }: ChatMessageContentProps) {
  if (message.startsWith("[image]")) {
    const src = message.replace("[image]", "");
    return <ChatImageMessage src={src} />;
  }
  return <p className="whitespace-pre-wrap break-words">{message}</p>;
}
