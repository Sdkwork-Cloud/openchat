import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";

export interface RichTextEditorRef {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  focus: () => void;
  insertContent: (content: string) => void;
}

export interface MediaItem {
  id: string;
  type: "image" | "video" | "file";
  url: string;
  name?: string;
  size?: number;
  thumbnail?: string;
  duration?: number;
}

interface ChatInputProps {
  editorRef?: RefObject<RichTextEditorRef>;
  onSend: (content: string, attachments?: MediaItem[]) => void;
  disabled?: boolean;
}

function createObjectUrl(file: Blob): string {
  return URL.createObjectURL(file);
}

function revokeObjectUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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

export const ChatInput = memo(function ChatInput({
  editorRef,
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const hasContent = draft.trim().length > 0 || attachments.length > 0;

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => revokeObjectUrl(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const next = fileArray.map((file) => {
      const url = createObjectUrl(file);
      objectUrlsRef.current.add(url);

      let type: MediaItem["type"] = "file";
      if (file.type.startsWith("image/")) {
        type = "image";
      } else if (file.type.startsWith("video/")) {
        type = "video";
      }

      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        url,
        name: file.name,
        size: file.size,
      } satisfies MediaItem;
    });

    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        revokeObjectUrl(target.url);
        objectUrlsRef.current.delete(target.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      addFiles(event.target.files);
      event.target.value = "";
    },
    [addFiles],
  );

  const handleScreenshotCapture = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track) {
        return;
      }

      const imageCapture = async (): Promise<File | null> => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          return null;
        }
        context.drawImage(video, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((result) => resolve(result), "image/png", 0.95);
        });
        video.pause();
        video.srcObject = null;

        if (!blob) return null;
        return new File([blob], `screenshot-${Date.now()}.png`, { type: "image/png" });
      };

      const file = await imageCapture();
      if (file) {
        addFiles([file]);
      }
      track.stop();
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }, [addFiles]);

  const handleSend = useCallback(() => {
    if (!hasContent || disabled) return;
    onSend(draft.trim(), attachments.length > 0 ? attachments : undefined);
    setDraft("");
    attachments.forEach((item) => {
      revokeObjectUrl(item.url);
      objectUrlsRef.current.delete(item.url);
    });
    setAttachments([]);
  }, [attachments, disabled, draft, hasContent, onSend]);

  if (editorRef) {
    (editorRef as MutableRefObject<RichTextEditorRef | null>).current = {
      getHTML: () => draft,
      getText: () => draft,
      clear: () => {
        setDraft("");
        setAttachments((prev) => {
          prev.forEach((item) => {
            revokeObjectUrl(item.url);
            objectUrlsRef.current.delete(item.url);
          });
          return [];
        });
      },
      focus: () => textAreaRef.current?.focus(),
      insertContent: (content: string) => setDraft((prev) => `${prev}${content}`),
    };
  }

  return (
    <div className={`relative border-t border-border bg-bg-secondary ${disabled ? "opacity-60" : ""}`}>
      {attachments.length > 0 ? (
        <div className="flex items-center gap-3 overflow-x-auto border-b border-border-light px-4 py-3">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="group relative flex-shrink-0">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-tertiary">
                {attachment.type === "image" ? (
                  <img src={attachment.url} alt={attachment.name} className="h-full w-full object-cover" />
                ) : attachment.type === "video" ? (
                  <span className="text-primary">▶</span>
                ) : (
                  <span className="text-text-muted">📄</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
              {attachment.size ? (
                <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-text-muted">
                  {formatFileSize(attachment.size)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-1">
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="文件">
            📎
          </ToolbarButton>
          <ToolbarButton onClick={() => void handleScreenshotCapture()} title="截图">
            📸
          </ToolbarButton>
          <ToolbarButton onClick={() => setDraft((prev) => `${prev}\n\`\`\`\n\n\`\`\`\n`)} title="代码块">
            {"</>"}
          </ToolbarButton>
          <ToolbarButton onClick={() => setDraft((prev) => `${prev}@`)} title="@提及">
            @
          </ToolbarButton>
        </div>
        <div className="text-xs text-text-muted">按 Enter 发送，Shift + Enter 换行</div>
      </div>

      <div className={`relative px-4 pb-2 ${isFocused ? "chat-input-focused" : ""}`}>
        <textarea
          ref={textAreaRef}
          value={draft}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          placeholder={attachments.length > 0 ? "添加描述..." : "输入消息..."}
          className="min-h-[80px] w-full resize-y rounded-lg border border-border bg-bg-tertiary p-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
        />

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
              hasContent && !disabled
                ? "bg-primary text-white hover:brightness-110"
                : "cursor-not-allowed bg-bg-hover text-text-muted"
            }`}
          >
            发送
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,*/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
});

interface ToolbarButtonProps {
  onClick: () => void;
  children: ReactNode;
  title?: string;
}

const ToolbarButton = memo(function ToolbarButton({
  onClick,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-lg p-2 text-text-tertiary transition-all duration-200 hover:bg-bg-hover hover:text-primary"
    >
      {children}
    </button>
  );
});

export default ChatInput;
