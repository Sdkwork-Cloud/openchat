/**
 * RichTextEditor 组件 - 基于 Tiptap 的富文本编辑器
 * 
 * 功能：
 * - Markdown 支持
 * - 代码高亮
 * - @提及
 * - 占位符
 * - AI 主题样式
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import { forwardRef, useImperativeHandle, useState } from 'react';

// 创建 lowlight 实例
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('json', json);
lowlight.register('bash', bash);

export interface RichTextEditorProps {
  placeholder?: string;
  onChange?: (html: string, text: string) => void;
  onSubmit?: () => void;
  initialContent?: string;
  disabled?: boolean;
  maxHeight?: number;
  minHeight?: number;
}

export interface RichTextEditorRef {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
  focus: () => void;
  insertContent: (content: string) => void;
}

/**
 * 富文本编辑器组件
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      placeholder = '输入消息...',
      onChange,
      onSubmit,
      initialContent = '',
      disabled = false,
      maxHeight = 200,
      minHeight = 60,
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: 'javascript',
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: 'is-editor-empty',
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          suggestion: {
            items: ({ query }) => {
              return [
                'OpenChat AI',
                '代码助手',
                '数据分析助手',
                '设计助手',
              ]
                .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
                .slice(0, 5);
            },
            render: () => {
              return {
                onStart: () => {
                  // 渲染提及建议列表
                },
                onUpdate: () => {
                  // 更新建议列表
                },
                onKeyDown: () => {
                  return false;
                },
                onExit: () => {
                  // 关闭建议列表
                },
              };
            },
          },
        }),
      ],
      content: initialContent,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        onChange?.(html, text);
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none',
        },
        handleKeyDown: (_view, event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
          return false;
        },
      },
    });

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      clear: () => editor?.commands.clearContent(),
      focus: () => editor?.commands.focus(),
      insertContent: (content: string) => editor?.commands.insertContent(content),
    }), [editor]);

    if (!editor) {
      return null;
    }

    return (
      <div
        className={`relative w-full bg-[#1F2937] border rounded-xl transition-all duration-200 ${
          isFocused
            ? 'border-[#00D4AA] shadow-[0_0_0_3px_rgba(0,212,170,0.1)]'
            : 'border-[rgba(255,255,255,0.08)]'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ minHeight, maxHeight }}
      >
        {/* 工具栏 */}
        <div className="flex items-center px-3 py-2 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center space-x-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="粗体"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="斜体"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="行内代码"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="代码块"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="无序列表"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="有序列表"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="引用"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </ToolbarButton>
          </div>
        </div>

        {/* 编辑器内容 */}
        <div className="overflow-y-auto" style={{ maxHeight: maxHeight - 45 }}>
          <EditorContent
            editor={editor}
            className="px-4 py-3 text-sm text-[#F9FAFB]"
          />
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

/**
 * 工具栏按钮
 */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all ${
        isActive
          ? 'text-[#00D4AA] bg-[rgba(0,212,170,0.15)]'
          : 'text-[#6B7280] hover:text-[#00D4AA] hover:bg-[rgba(255,255,255,0.05)]'
      }`}
    >
      {children}
    </button>
  );
}

export default RichTextEditor;
