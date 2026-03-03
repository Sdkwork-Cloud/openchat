/**
 * MarkdownRenderer 缁勪欢 - Markdown 娓叉煋鍣? *
 * 鍔熻兘锛? * - Markdown 娓叉煋
 * - 浠ｇ爜楂樹寒
 * - AI 涓婚鏍峰紡
 * - 鎬ц兘浼樺寲
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
 * Markdown 娓叉煋缁勪欢
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({
  content,
  className = '',
}) => {
  const components = useMemo(() => ({
    // 浠ｇ爜鍧?    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';

      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-sm">
          {/* 浠ｇ爜鍧楀ご閮?*/}
          <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-white/5">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-xs text-text-muted uppercase font-medium tracking-wider">{language}</span>
          </div>
          {/* 浠ｇ爜鍐呭 */}
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '16px',
              background: '#0d1117', // Keep code background dark for contrast
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

    // 娈佃惤
    p({ children }: any) {
      return <p className="mb-3 leading-relaxed text-text-secondary last:mb-0">{children}</p>;
    },

    // 鏍囬
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mb-4 text-text-primary mt-6 border-b border-border pb-2">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mb-3 text-text-primary mt-5">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-semibold mb-2 text-text-primary mt-4">{children}</h3>;
    },
    h4({ children }: any) {
      return <h4 className="text-base font-semibold mb-2 text-text-primary mt-3">{children}</h4>;
    },

    // 鍒楄〃
    ul({ children }: any) {
      return <ul className="mb-3 pl-5 space-y-1 list-disc text-text-secondary marker:text-text-muted">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="mb-3 pl-5 space-y-1 list-decimal text-text-secondary marker:text-text-muted">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="leading-relaxed">{children}</li>;
    },

    // 寮曠敤
    blockquote({ children }: any) {
      return (
        <blockquote className="mb-3 pl-4 border-l-4 border-primary bg-primary/5 py-2 px-3 rounded-r-lg text-text-tertiary italic">
          {children}
        </blockquote>
      );
    },

    // 閾炬帴
    a({ children, href }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-hover hover:underline transition-colors decoration-primary/30 underline-offset-2"
        >
          {children}
        </a>
      );
    },

    // 寮鸿皟
    strong({ children }: any) {
      return <strong className="font-bold text-text-primary">{children}</strong>;
    },
    em({ children }: any) {
      return <em className="italic text-text-secondary">{children}</em>;
    },

    // 鍒犻櫎绾?    del({ children }: any) {
      return <del className="line-through text-text-muted">{children}</del>;
    },

    // 琛ㄦ牸
    table({ children }: any) {
      return (
        <div className="overflow-x-auto mb-3 rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: any) {
      return <thead className="bg-bg-tertiary">{children}</thead>;
    },
    tbody({ children }: any) {
      return <tbody className="divide-y divide-border">{children}</tbody>;
    },
    tr({ children }: any) {
      return <tr className="border-b border-border last:border-0 hover:bg-bg-hover/50 transition-colors">{children}</tr>;
    },
    th({ children }: any) {
      return <th className="px-4 py-2 text-left font-semibold text-text-primary">{children}</th>;
    },
    td({ children }: any) {
      return <td className="px-4 py-2 text-text-secondary">{children}</td>;
    },

    // 姘村钩绾?    hr() {
      return <hr className="my-6 border-border" />;
    },

    // 鍥剧墖
    img({ src, alt }: any) {
      return (
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-lg border border-border my-3 shadow-sm hover:shadow-md transition-shadow"
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

