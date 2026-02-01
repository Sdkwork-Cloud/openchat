/**
 * MarkdownRenderer 组件 - Markdown 渲染器
 *
 * 功能：
 * - Markdown 渲染
 * - 代码高亮
 * - AI 主题样式
 * - 性能优化
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown 渲染组件
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  content,
  className = '',
}) => {
  const components = useMemo(() => ({
    // 代码块
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';

      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 bg-[rgba(0,212,170,0.1)] text-[#00D4AA] rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="my-3 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
          {/* 代码块头部 */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e]">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
            </div>
            <span className="text-xs text-[#6B7280] uppercase">{language}</span>
          </div>
          {/* 代码内容 */}
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '16px',
              background: '#0d1117',
              fontSize: '13px',
              lineHeight: '1.6',
            }}
            showLineNumbers
            lineNumberStyle={{
              color: '#6B7280',
              paddingRight: '16px',
              minWidth: '40px',
            }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    },

    // 段落
    p({ children }: any) {
      return <p className="mb-3 leading-relaxed text-[#E5E7EB]">{children}</p>;
    },

    // 标题
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mb-4 text-[#F9FAFB] mt-6">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mb-3 text-[#F9FAFB] mt-5">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-semibold mb-2 text-[#F9FAFB] mt-4">{children}</h3>;
    },
    h4({ children }: any) {
      return <h4 className="text-base font-semibold mb-2 text-[#F9FAFB] mt-3">{children}</h4>;
    },

    // 列表
    ul({ children }: any) {
      return <ul className="mb-3 pl-5 space-y-1 list-disc text-[#E5E7EB]">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="mb-3 pl-5 space-y-1 list-decimal text-[#E5E7EB]">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="leading-relaxed">{children}</li>;
    },

    // 引用
    blockquote({ children }: any) {
      return (
        <blockquote className="mb-3 pl-4 border-l-4 border-[#00D4AA] bg-[rgba(0,212,170,0.05)] py-2 px-3 rounded-r-lg text-[#9CA3AF]">
          {children}
        </blockquote>
      );
    },

    // 链接
    a({ children, href }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00D4AA] hover:text-[#00E4BA] hover:underline transition-colors"
        >
          {children}
        </a>
      );
    },

    // 强调
    strong({ children }: any) {
      return <strong className="font-semibold text-[#F9FAFB]">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-[#E5E7EB]">{children}</em>;
    },

    // 删除线
    del({ children }: any) {
      return <del className="line-through text-[#6B7280]">{children}</del>;
    },

    // 表格
    table({ children }: any) {
      return (
        <div className="overflow-x-auto mb-3">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-[#1F2937]">{children}</thead>;
    },
    tbody({ children }: any) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }: any) {
      return <tr className="border-b border-[rgba(255,255,255,0.05)]">{children}</tr>;
    },
    th({ children }: any) {
      return <th className="px-4 py-2 text-left font-semibold text-[#F9FAFB]">{children}</th>;
    },
    td({ children }: any) {
      return <td className="px-4 py-2 text-[#E5E7EB]">{children}</td>;
    },

    // 水平线
    hr() {
      return <hr className="my-4 border-[rgba(255,255,255,0.1)]" />;
    },

    // 图片
    img({ src, alt }: any) {
      return (
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-lg border border-[rgba(255,255,255,0.1)] my-3"
          loading="lazy"
        />
      );
    },
  }), []);

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
