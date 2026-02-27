/**
 * 消息气泡组件
 *
 * 职责：渲染单个消息气泡，支持文本、图片、视频、文件
 */

import { memo, useState, useCallback } from "react";
import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer";
import {
  MediaViewer,
  type MediaItem,
} from "../../../components/ui/MediaViewer";
import type { Message, MessageAttachment } from "../entities/message.entity";

interface MessageBubbleProps {
  message: Message;
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * 获取文件图标
 */
const getFileIcon = (filename?: string): string => {
  if (!filename) return "📄";
  const ext = filename.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    pdf: "📕",
    doc: "📘",
    docx: "📘",
    xls: "📗",
    xlsx: "📗",
    ppt: "📙",
    pptx: "📙",
    zip: "📦",
    rar: "📦",
    mp3: "🎵",
    mp4: "🎬",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
  };
  return iconMap[ext || ""] || "📄";
};

/**
 * 获取消息文本内容
 */
const getMessageText = (content: Message["content"]): string => {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && "text" in content)
    return content.text || "";
  return "";
};

/**
 * 转换附件为 MediaItem
 */
const convertToMediaItem = (attachment: MessageAttachment): MediaItem => ({
  id: attachment.id,
  type:
    attachment.type === "audio"
      ? "file"
      : (attachment.type as "image" | "video" | "file"),
  url: attachment.url,
  name: attachment.name,
  size: attachment.size,
  thumbnail: attachment.thumbnailUrl,
  duration: attachment.duration,
});

export const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.type === "user";
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const messageText = getMessageText(message.content);

  // 打开媒体查看器
  const openMediaViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  // 下载文件
  const handleDownload = useCallback((item: MediaItem) => {
    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = item.name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // 转换附件为 MediaItem 数组
  const mediaItems: MediaItem[] = (message.attachments || []).map(
    convertToMediaItem,
  );

  return (
    <>
      <div
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-5 animate-fade-in`}
      >
        {!isUser && (
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mr-3 shadow-md">
            AI
          </div>
        )}

        <div
          className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[75%]`}
        >
          {/* 时间 */}
          <span className="text-xs text-text-muted mb-1.5">{message.time}</span>

          {/* 气泡 */}
          <div
            className={`relative px-5 py-3.5 text-sm leading-relaxed shadow-md transition-all duration-200 ${
              isUser
                ? "bg-primary text-white rounded-2xl rounded-tr-sm hover:shadow-lg hover:shadow-primary/20"
                : "bg-bg-tertiary text-text-primary rounded-2xl rounded-tl-sm border border-border hover:border-primary/30"
            }`}
          >
            {message.isTyping ? (
              <div className="flex items-center space-x-1 py-1">
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"></span>
              </div>
            ) : (
              <>
                {/* 文本内容 */}
                {messageText && (
                  <div className={hasAttachments ? "mb-3" : ""}>
                    {isUser ? (
                      messageText
                    ) : (
                      <MarkdownRenderer content={messageText} />
                    )}
                  </div>
                )}

                {/* 附件内容 */}
                {hasAttachments && (
                  <div
                    className={`space-y-2 ${messageText ? "pt-3 border-t border-white/10" : ""}`}
                  >
                    {message.attachments?.map((attachment, index) => (
                      <AttachmentItem
                        key={attachment.id}
                        attachment={attachment}
                        isUser={isUser}
                        onClick={() => openMediaViewer(index)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 状态 */}
          {isUser && message.status && (
            <div className="flex items-center mt-1.5 space-x-1.5">
              {message.status === "sending" && (
                <div className="w-3 h-3 border-2 border-text-muted border-t-transparent rounded-full animate-spin"></div>
              )}
              {message.status === "read" && (
                <span className="text-xs text-primary">已读</span>
              )}
              {message.status === "sent" && (
                <span className="text-xs text-text-muted">已发送</span>
              )}
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ml-3 shadow-md">
            Me
          </div>
        )}
      </div>

      {/* 媒体查看器 */}
      {hasAttachments && mediaItems.length > 0 && (
        <MediaViewer
          items={mediaItems}
          initialIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
});

MessageBubble.displayName = "MessageBubble";

/**
 * 附件项组件
 */
interface AttachmentItemProps {
  attachment: MessageAttachment;
  isUser: boolean;
  onClick: () => void;
}

const AttachmentItem = memo(
  ({ attachment, isUser, onClick }: AttachmentItemProps) => {
    // 图片附件
    if (attachment.type === "image") {
      return (
        <div
          onClick={onClick}
          className="cursor-pointer rounded-lg overflow-hidden border border-white/10 hover:opacity-90 transition-opacity max-w-[200px]"
        >
          <img
            src={attachment.url}
            alt={attachment.name || "图片"}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // 视频附件
    if (attachment.type === "video") {
      return (
        <div
          onClick={onClick}
          className="cursor-pointer relative rounded-lg overflow-hidden border border-border bg-bg-secondary w-[200px] h-[120px] flex items-center justify-center group"
        >
          {attachment.thumbnailUrl ? (
            <img
              src={attachment.thumbnailUrl}
              alt={attachment.name || "视频"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          {/* 播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-primary ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {/* 时长 */}
          {attachment.duration && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-white text-xs backdrop-blur-sm">
              {Math.floor(attachment.duration / 60)}:
              {(attachment.duration % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>
      );
    }

    // 文件附件
    return (
      <div
        onClick={onClick}
        className={`cursor-pointer flex items-center p-3 rounded-lg border transition-colors ${
          isUser
            ? "bg-white/10 border-white/20 hover:bg-white/15"
            : "bg-bg-secondary border-border hover:bg-bg-tertiary"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-2xl flex-shrink-0">
          {getFileIcon(attachment.name)}
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${isUser ? "text-white" : "text-text-primary"}`}
          >
            {attachment.name || "未知文件"}
          </p>
          <p
            className={`text-xs ${isUser ? "text-white/70" : "text-text-muted"}`}
          >
            {formatFileSize(attachment.size)}
          </p>
        </div>
        <svg
          className={`w-5 h-5 ml-2 ${isUser ? "text-white/50" : "text-text-muted"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </div>
    );
  },
);

AttachmentItem.displayName = "AttachmentItem";
