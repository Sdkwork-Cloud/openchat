/**
 * RichTextEditor 缁勪欢 - 鍩轰簬 Tiptap 鐨勫瘜鏂囨湰缂栬緫鍣? * 
 * 鍔熻兘锛? * - Markdown 鏀寔
 * - 浠ｇ爜楂樹寒
 * - @鎻愬強
 * - 鍗犱綅绗? * - AI 涓婚鏍峰紡
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

// 鍒涘缓 lowlight 瀹炰緥
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
 * 瀵屾枃鏈紪杈戝櫒缁勪欢
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      placeholder = '杈撳叆娑堟伅...',
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
                '浠ｇ爜鍔╂墜',
                '鏁版嵁鍒嗘瀽鍔╂墜',
                '璁捐鍔╂墜',
              ]
                .filter(item => item.toLowerCase().startsWith(query.toLowerCase()))
                .slice(0, 5);
            },
            render: () => {
              return {
                onStart: () => {
                  // 娓叉煋鎻愬強寤鸿鍒楄〃
                },
                onUpdate: () => {
                  // 鏇存柊寤鸿鍒楄〃
                },
                onKeyDown: () => {
                  return false;
                },
                onExit: () => {
                  // 鍏抽棴寤鸿鍒楄〃
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

    // 鏆撮湶鏂规硶缁欑埗缁勪欢
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
        className={`relative w-full bg-bg-tertiary border rounded-2xl transition-all duration-300 ${
          isFocused
            ? 'border-primary ring-2 ring-primary/20 shadow-glow-primary'
            : 'border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ minHeight, maxHeight }}
      >
        {/* 宸ュ叿鏍?*/}
        <div className="flex items-center px-3 py-2 border-b border-border bg-bg-secondary/50 backdrop-blur-sm rounded-t-2xl">
          <div className="flex items-center space-x-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="绮椾綋"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8zm0 0h10a4 4 0 110 8H6v-8z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="鏂滀綋"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="琛屽唴浠ｇ爜"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="浠ｇ爜鍧?
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="鏃犲簭鍒楄〃"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="鏈夊簭鍒楄〃"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7h.01M3 12h.01M3 17h.01" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="寮曠敤"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </ToolbarButton>
          </div>
        </div>

        {/* 缂栬緫鍣ㄥ唴瀹?*/}
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium hover:scrollbar-thumb-text-muted" style={{ maxHeight: maxHeight - 45 }}>
          <EditorContent
            editor={editor}
            className="px-4 py-3 text-sm text-text-primary font-medium leading-relaxed"
          />
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

/**
 * 宸ュ叿鏍忔寜閽? */
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
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        isActive
          ? 'text-primary bg-primary-soft shadow-sm scale-110'
          : 'text-text-tertiary hover:text-primary hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

export default RichTextEditor;

