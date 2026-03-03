import { memo } from "react";
import type { Message, MessageAttachment } from "../entities/message.entity";

interface MessageBubbleProps {
  message: Message;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getMessageText(content: Message["content"]): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && "text" in content) {
    return content.text || "";
  }
  return "";
}

function openAttachment(url: string): void {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

const AttachmentItem = memo(function AttachmentItem({
  attachment,
  isUser,
}: {
  attachment: MessageAttachment;
  isUser: boolean;
}) {
  const sharedClass = isUser
    ? "border border-white/20 bg-white/10 text-white"
    : "border border-border bg-bg-secondary text-text-primary";

  if (attachment.type === "image") {
    return (
      <button
        type="button"
        onClick={() => openAttachment(attachment.url)}
        className="overflow-hidden rounded-lg border border-white/10"
      >
        <img
          src={attachment.url}
          alt={attachment.name || "图片"}
          className="max-h-[220px] w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  if (attachment.type === "video") {
    return (
      <button
        type="button"
        onClick={() => openAttachment(attachment.url)}
        className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${sharedClass}`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 text-primary">
          ▶
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{attachment.name || "视频文件"}</p>
          <p className="text-xs opacity-80">
            {attachment.duration ? `${Math.floor(attachment.duration)}s` : formatFileSize(attachment.size)}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAttachment(attachment.url)}
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left ${sharedClass}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-tertiary text-lg">📄</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name || "文件"}</p>
        <p className="text-xs opacity-80">{formatFileSize(attachment.size)}</p>
      </div>
    </button>
  );
});

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "user";
  const hasAttachments = !!message.attachments?.length;
  const messageText = getMessageText(message.content);

  return (
    <div className={`mb-5 flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      {!isUser ? (
        <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-md">
          AI
        </div>
      ) : null}

      <div className={`flex max-w-[75%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <span className="mb-1.5 text-xs text-text-muted">{message.time}</span>

        <div
          className={`relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md ${
            isUser
              ? "rounded-tr-sm bg-primary text-white"
              : "rounded-tl-sm border border-border bg-bg-tertiary text-text-primary"
          }`}
        >
          {message.isTyping ? (
            <div className="flex items-center space-x-1 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary" />
            </div>
          ) : null}

          {!message.isTyping && messageText ? (
            <p className="whitespace-pre-wrap break-words">{messageText}</p>
          ) : null}

          {!message.isTyping && hasAttachments ? (
            <div className={`space-y-2 ${messageText ? "mt-3 border-t border-white/10 pt-3" : ""}`}>
              {message.attachments?.map((attachment) => (
                <AttachmentItem key={attachment.id} attachment={attachment} isUser={isUser} />
              ))}
            </div>
          ) : null}
        </div>

        {isUser && message.status ? (
          <div className="mt-1.5 flex items-center space-x-1.5">
            {message.status === "sending" ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
            ) : null}
            {message.status === "read" ? <span className="text-xs text-primary">已读</span> : null}
            {message.status === "sent" ? <span className="text-xs text-text-muted">已发送</span> : null}
          </div>
        ) : null}
      </div>

      {isUser ? (
        <div className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500 text-sm font-bold text-white shadow-md">
          Me
        </div>
      ) : null}
    </div>
  );
});

export default MessageBubble;

