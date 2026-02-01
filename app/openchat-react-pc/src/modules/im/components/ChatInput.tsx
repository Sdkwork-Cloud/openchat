/**
 * 聊天输入组件 - 参考微信PC版设计
 *
 * 特点：
 * - 底部工具栏（表情、文件、截图等）
 * - 干净的输入区域，无原生toolbar
 * - 右下角发送按钮
 * - 支持快捷键发送
 * - 表情选择器
 * - 文件上传预览
 */

import { memo, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { RichTextEditorRef } from '../../../components/ui/RichTextEditor';
import { EmojiPicker } from '../../../components/ui/EmojiPicker';
import type { MediaItem } from '../../../components/ui/MediaViewer';
import { useObjectURL } from '../../../hooks/useObjectURL';

interface ChatInputProps {
  editorRef?: React.RefObject<RichTextEditorRef>;
  onSend: (content: string, attachments?: MediaItem[]) => void;
  disabled?: boolean;
}

/**
 * 聊天输入组件
 */
export const ChatInput = memo(({ editorRef, onSend, disabled = false }: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const objectURLManager = useObjectURL();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 禁用所有默认快捷键和工具栏相关的扩展
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Placeholder.configure({
        placeholder: attachments.length > 0 ? '添加描述...' : '输入消息...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setHasContent(text.trim().length > 0 || attachments.length > 0);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: 'chat-editor-content focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (hasContent) {
            handleSend();
          }
          return true;
        }
        return false;
      },
    },
  });

  // 暴露方法给父组件
  const internalRef = useRef({
    getHTML: () => editor?.getHTML() || '',
    getText: () => editor?.getText() || '',
    clear: () => {
      editor?.commands.clearContent();
      setAttachments([]);
      setHasContent(false);
    },
    focus: () => editor?.commands.focus(),
    insertContent: (content: string) => editor?.commands.insertContent(content),
  });

  // 同步 ref
  if (editorRef) {
    (editorRef as any).current = internalRef.current;
  }

  // 处理发送
  const handleSend = useCallback(() => {
    const text = editor?.getText() || '';
    if (text.trim() || attachments.length > 0) {
      onSend(text, attachments.length > 0 ? attachments : undefined);
      editor?.commands.clearContent();
      setAttachments([]);
      setHasContent(false);
    }
  }, [editor, attachments, onSend]);

  // 处理表情选择
  const handleEmojiSelect = useCallback((emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
  }, [editor]);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      // 使用安全的 Object URL 管理器
      const url = objectURLManager.create(file);
      let type: MediaItem['type'] = 'file';
      
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      }

      const newAttachment: MediaItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        url,
        name: file.name,
        size: file.size,
      };

      setAttachments(prev => [...prev, newAttachment]);
      setHasContent(true);
    });

    // 清空 input 以便可以重复选择同一文件
    e.target.value = '';
  }, [objectURLManager]);

  // 移除附件
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      // 释放 Object URL
      if (attachment?.url) {
        objectURLManager.revoke(attachment.url);
      }
      
      const filtered = prev.filter(a => a.id !== id);
      // 如果没有附件且没有文本内容，重置 hasContent
      const text = editor?.getText() || '';
      setHasContent(text.trim().length > 0 || filtered.length > 0);
      return filtered;
    });
  }, [editor, objectURLManager]);

  // 处理工具栏按钮点击
  const handleToolbarAction = useCallback((action: string) => {
    if (!editor) return;

    switch (action) {
      case 'emoji':
        setIsEmojiPickerOpen(prev => !prev);
        break;
      case 'file':
        fileInputRef.current?.click();
        break;
      case 'screenshot':
        // TODO: 截图功能需要接入 Platform API
        console.log('截图功能待实现');
        break;
      case 'code':
        editor.chain().focus().insertContent('```\n\n```').run();
        break;
      case 'mention':
        editor.chain().focus().insertContent('@').run();
        break;
    }
  }, [editor]);

  // 格式化文件大小
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`
        relative bg-[var(--bg-secondary)] border-t border-[var(--border-color)]
        transition-all duration-200
        ${disabled ? 'opacity-60' : ''}
      `}
    >
      {/* 附件预览区 */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-light)] overflow-x-auto">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative flex-shrink-0 group"
            >
              {attachment.type === 'image' ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border-color)]">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : attachment.type === 'video' ? (
                <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--ai-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex flex-col items-center justify-center px-1">
                  <svg className="w-6 h-6 text-[var(--text-tertiary)] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-center">
                    {attachment.name?.slice(0, 8)}...
                  </span>
                </div>
              )}
              {/* 删除按钮 */}
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--ai-error)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* 文件大小 */}
              {attachment.size && (
                <span className="absolute -bottom-4 left-0 right-0 text-[9px] text-[var(--text-muted)] text-center">
                  {formatFileSize(attachment.size)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 工具栏 - 微信风格 */}
      <div ref={toolbarRef} className="flex items-center justify-between px-4 py-2 relative">
        {/* 左侧工具按钮 */}
        <div className="flex items-center space-x-1">
          {/* 表情按钮 */}
          <div className="relative">
            <ToolbarButton
              onClick={() => handleToolbarAction('emoji')}
              title="表情"
              isActive={isEmojiPickerOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>
            {/* 表情选择器 */}
            <EmojiPicker
              isOpen={isEmojiPickerOpen}
              onClose={() => setIsEmojiPickerOpen(false)}
              onSelect={handleEmojiSelect}
              anchorEl={toolbarRef.current}
            />
          </div>

          {/* 文件按钮 */}
          <ToolbarButton
            onClick={() => handleToolbarAction('file')}
            title="文件"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </ToolbarButton>

          {/* 截图按钮 */}
          <ToolbarButton
            onClick={() => handleToolbarAction('screenshot')}
            title="截图"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </ToolbarButton>

          <div className="w-px h-5 bg-[var(--border-color)] mx-2" />

          {/* 代码块按钮 */}
          <ToolbarButton
            onClick={() => handleToolbarAction('code')}
            title="代码块"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </ToolbarButton>

          {/* @提及按钮 */}
          <ToolbarButton
            onClick={() => handleToolbarAction('mention')}
            title="@提及"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </ToolbarButton>
        </div>

        {/* 右侧提示 */}
        <div className="text-xs text-[var(--text-muted)]">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>

      {/* 输入区域 - 干净的编辑区 */}
      <div
        className={`
          relative px-4 pb-2
          ${isFocused ? 'chat-input-focused' : ''}
        `}
      >
        <EditorContent
          editor={editor}
          className={`
            chat-editor
            min-h-[60px] max-h-[160px]
            text-sm text-[var(--text-primary)] leading-relaxed
            overflow-y-auto
            ${isFocused ? 'chat-editor-focused' : ''}
          `}
        />

        {/* 发送按钮 - 微信风格 */}
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className={`
              px-6 py-2 text-sm font-medium rounded-lg
              transition-all duration-200
              flex items-center space-x-2
              ${hasContent && !disabled
                ? 'bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white shadow-[var(--shadow-glow)]'
                : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              }
            `}
          >
            <span>发送</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,*/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <style>{`
        .chat-editor .ProseMirror {
          min-height: 60px;
          padding: 4px 0;
          outline: none;
        }
        
        .chat-editor .ProseMirror p {
          margin: 0;
          line-height: 1.6;
        }
        
        .chat-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }

        /* 隐藏所有原生工具栏 */
        .chat-editor .ProseMirror-focused {
          outline: none;
        }

        /* 选中文字样式 */
        .chat-editor .ProseMirror ::selection {
          background: var(--ai-primary-soft);
        }
      `}</style>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

/**
 * 工具栏按钮组件
 */
interface ToolbarButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  isActive?: boolean;
}

const ToolbarButton = memo(({ onClick, children, title, isActive = false }: ToolbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${isActive
          ? 'text-[var(--ai-primary)] bg-[var(--ai-primary-soft)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--ai-primary)] hover:bg-[var(--bg-hover)]'
        }
      `}
    >
      {children}
    </button>
  );
});

ToolbarButton.displayName = 'ToolbarButton';

export default ChatInput;
