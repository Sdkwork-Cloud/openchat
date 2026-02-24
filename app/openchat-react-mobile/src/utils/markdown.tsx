import React, { useMemo, useState } from 'react';
import { Platform } from '../platform';

// --- Syntax Highlighter (Lightweight) ---
const highlightCode = (code: string) => {
    const tokens = code.split(/(\/\/.*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|class|interface|type|async|await|try|catch|new|this|extends|implements|public|private|protected|readonly|static|switch|case|break|default|continue|do|void|enum)\b|\b(?:true|false|null|undefined)\b|\b\d+\b|[{}()[\],.;])/g);

    return tokens.map((token, i) => {
        if (!token) return null;
        let color = '#e0e0e0'; // Default
        let fontStyle = 'normal';

        if (/^(\/\/.*|\/\*[\s\S]*?\*\/)$/.test(token)) color = '#6a9955'; // Comment
        else if (/^["'`]/.test(token)) color = '#ce9178'; // String
        else if (/^(const|let|var|function|return|if|else|for|while|import|from|export|class|interface|type|async|await|try|catch|new|this|extends|implements|public|private|protected|readonly|static|switch|case|break|default|continue|do|void|enum)$/.test(token)) {
            color = '#569cd6'; // Keyword
            fontStyle = 'italic';
        }
        else if (/^(true|false|null|undefined)$/.test(token)) color = '#569cd6'; // Boolean/Null
        else if (/^\d+$/.test(token)) color = '#b5cea8'; // Number
        else if (/^[A-Z][a-zA-Z0-9]*$/.test(token)) color = '#4ec9b0'; // Class/Type hint

        return <span key={i} style={{ color, fontStyle }}>{token}</span>;
    });
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Platform.clipboard.write(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div style={{
      background: '#1e1e1e',
      borderRadius: '12px',
      margin: '16px 0',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
    }}>
      {/* Mac-style Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: '#252526', borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{language || 'TEXT'}</span>
            <div 
                onClick={handleCopy}
                style={{ 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    color: copied ? '#4ec9b0' : '#888', transition: 'color 0.2s'
                }}
            >
                {copied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
            </div>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div style={{
        padding: '16px 0', overflowX: 'auto', 
        fontSize: '13px', lineHeight: '1.6',
        display: 'flex'
      }}>
        <div style={{ 
            padding: '0 12px 0 16px', textAlign: 'right', color: '#6e7681', 
            userSelect: 'none', borderRight: '1px solid #333', marginRight: '16px' 
        }}>
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <div style={{ flex: 1, paddingRight: '16px', whiteSpace: 'pre', color: '#d4d4d4' }}>
            {highlightCode(code)}
        </div>
      </div>
    </div>
  );
});

// --- Table Parser ---
const MarkdownTable: React.FC<{ content: string }> = ({ content }) => {
    const rows = content.trim().split('\n').map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    ).filter(row => row.length > 0);

    if (rows.length < 2) return <pre>{content}</pre>; // Fallback

    const header = rows[0];
    const alignments = rows[1].map(cell => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
    });
    const body = rows.slice(2);

    return (
        <div style={{ overflowX: 'auto', margin: '16px 0', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'var(--bg-card)' }}>
                <thead>
                    <tr style={{ background: 'var(--bg-cell-active)' }}>
                        {header.map((h, i) => (
                            <th key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', textAlign: alignments[i] as any, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {body.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < body.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                            {row.map((cell, j) => (
                                <td key={j} style={{ padding: '10px 12px', textAlign: alignments[j] as any, color: 'var(--text-primary)' }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Parser Logic ---

interface Token {
  type: 'text' | 'code-block' | 'table';
  content: string;
  language?: string;
}

function parseStreamingMarkdown(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    // 1. Check for Code Block
    const codeOpenIndex = text.indexOf('```', cursor);
    
    // 2. Check for Table (Simple check: line starts with | and contains |)
    // We only check for tables at start of line
    let tableMatch = null;
    let tableStartIndex = -1;
    
    // Simple heuristic: look for lines that look like table rows
    const rest = text.slice(cursor);
    const tableRegex = /(^|\n)(\|.*\|[ \t]*\n\|[-:| ]+\|.*)/; // Match header and separator
    const match = rest.match(tableRegex);
    
    if (match && match.index !== undefined) {
        // Only valid if it appears BEFORE the next code block
        const absIndex = cursor + match.index + (match[1] ? match[1].length : 0);
        if (codeOpenIndex === -1 || absIndex < codeOpenIndex) {
            tableStartIndex = absIndex;
            // Find end of table (consecutive lines with |)
            let tableEnd = tableStartIndex;
            const lines = text.slice(tableStartIndex).split('\n');
            let tableContent = '';
            for (const line of lines) {
                if (line.trim().startsWith('|')) {
                    tableContent += line + '\n';
                    tableEnd += line.length + 1; // +1 for newline
                } else {
                    break;
                }
            }
            tableMatch = { start: tableStartIndex, end: tableEnd, content: tableContent };
        }
    }

    // Decide which comes first
    let nextType: 'code' | 'table' | 'none' = 'none';
    let nextIndex = -1;

    if (codeOpenIndex !== -1 && (tableStartIndex === -1 || codeOpenIndex < tableStartIndex)) {
        nextType = 'code';
        nextIndex = codeOpenIndex;
    } else if (tableStartIndex !== -1) {
        nextType = 'table';
        nextIndex = tableStartIndex;
    }

    if (nextType === 'none') {
        tokens.push({ type: 'text', content: text.slice(cursor) });
        break;
    }

    // Push text before the special block
    if (nextIndex > cursor) {
        tokens.push({ type: 'text', content: text.slice(cursor, nextIndex) });
    }

    if (nextType === 'code') {
        const contentStart = codeOpenIndex + 3;
        let codeStart = contentStart;
        let language = '';
        const firstNewline = text.indexOf('\n', contentStart);
        if (firstNewline !== -1) {
            const line = text.slice(contentStart, firstNewline).trim();
            if (line.length < 20 && !line.includes('`')) {
                language = line;
                codeStart = firstNewline + 1;
            }
        }
        const closeIndex = text.indexOf('```', codeStart);
        if (closeIndex !== -1) {
            const code = text.slice(codeStart, closeIndex);
            tokens.push({ type: 'code-block', content: code.endsWith('\n') ? code.slice(0, -1) : code, language });
            cursor = closeIndex + 3;
        } else {
            tokens.push({ type: 'code-block', content: text.slice(codeStart), language });
            break;
        }
    } else if (nextType === 'table' && tableMatch) {
        tokens.push({ type: 'table', content: tableMatch.content });
        cursor = tableMatch.end;
    }
  }
  return tokens;
}

// --- Inline Parser (Enhanced) ---

function parseInline(text: string, onImageClick?: (url: string) => void): React.ReactNode[] {
  if (!text) return [];

  // Split by bold, code, link, image
  const regex = /(!\[.*?\]\(.*?\))|(\[.*?\]\(.*?\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  
  const parts = text.split(regex);
  const matches = text.match(regex);
  
  if (!matches) return [text];

  const result: React.ReactNode[] = [];
  let matchIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (matches[matchIndex] === part) {
      if (part.startsWith('![')) {
        const m = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (m) {
          result.push(
            <div key={i} style={{ borderRadius: '12px', overflow: 'hidden', margin: '16px 0', background: 'var(--bg-cell-top)', border: '1px solid var(--border-color)' }}>
                <img 
                  src={m[2]} 
                  alt={m[1]} 
                  onClick={(e) => { e.stopPropagation(); onImageClick?.(m[2]); }}
                  style={{ width: '100%', display: 'block', cursor: 'zoom-in' }} 
                  loading="lazy"
                />
            </div>
          );
        }
      } else if (part.startsWith('[')) {
        const m = part.match(/\[(.*?)\]\((.*?)\)/);
        if (m) {
          result.push(
            <a 
              key={i} href={m[2]} target="_blank" rel="noreferrer"
              style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500 }}
              onClick={(e) => e.stopPropagation()}
            >
              {m[1]}
            </a>
          );
        }
      } else if (part.startsWith('`')) {
        result.push(
          <span key={i} style={{ 
              background: 'rgba(128,128,128,0.15)', padding: '2px 5px', 
              borderRadius: '4px', fontFamily: '"JetBrains Mono", monospace', color: '#e83e8c', 
              fontSize: '0.92em', margin: '0 2px' 
          }}>
            {part.slice(1, -1)}
          </span>
        );
      } else if (part.startsWith('**')) {
        result.push(<strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('*')) {
        result.push(<em key={i} style={{ fontStyle: 'italic', opacity: 0.9 }}>{part.slice(1, -1)}</em>);
      }
      matchIndex++;
    } else if (part) {
      result.push(part);
    }
  }
  return result;
}

function parseBlockElements(text: string, keyOffset: number, onImageClick?: (url: string) => void): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const key = `block-${keyOffset}-${i}`;

    if (!trimmed) {
        if (i < lines.length - 1) nodes.push(<div key={key} style={{ height: '12px' }} />);
        continue;
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={key} style={{ fontSize: '22px', fontWeight: 700, margin: '24px 0 12px 0', lineHeight: 1.3 }}>{parseInline(trimmed.slice(2), onImageClick)}</h1>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={key} style={{ fontSize: '18px', fontWeight: 600, margin: '20px 0 10px 0', lineHeight: 1.4 }}>{parseInline(trimmed.slice(3), onImageClick)}</h2>);
    } else if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={key} style={{ fontSize: '16px', fontWeight: 600, margin: '16px 0 8px 0', lineHeight: 1.4 }}>{parseInline(trimmed.slice(4), onImageClick)}</h3>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      nodes.push(
        <div key={key} style={{ display: 'flex', marginBottom: '6px', paddingLeft: '4px' }}>
          <span style={{ marginRight: '8px', color: 'var(--primary-color)', fontSize: '16px', lineHeight: '24px' }}>•</span>
          <span style={{ flex: 1, lineHeight: '1.6' }}>{parseInline(trimmed.slice(2), onImageClick)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const dot = trimmed.indexOf('.');
      nodes.push(
        <div key={key} style={{ display: 'flex', marginBottom: '6px', paddingLeft: '4px' }}>
          <span style={{ marginRight: '8px', opacity: 0.8, fontWeight: 500, fontFeatureSettings: '"tnum"' }}>{trimmed.slice(0, dot + 1)}</span>
          <span style={{ flex: 1, lineHeight: '1.6' }}>{parseInline(trimmed.slice(dot + 1).trim(), onImageClick)}</span>
        </div>
      );
    } else if (trimmed.startsWith('> ')) {
      nodes.push(
        <div key={key} style={{ 
            borderLeft: '4px solid var(--primary-color)', padding: '12px 16px', 
            margin: '16px 0', color: 'var(--text-primary)', opacity: 0.9,
            background: 'var(--bg-cell-top)', borderRadius: '0 8px 8px 0',
            lineHeight: '1.6', fontSize: '15px'
        }}>
          {parseInline(trimmed.slice(2), onImageClick)}
        </div>
      );
    } else {
      nodes.push(
        <div key={key} style={{ marginBottom: '8px', lineHeight: 1.6, textAlign: 'justify', fontSize: '16px', color: 'var(--text-primary)' }}>
          {parseInline(line, onImageClick)}
        </div>
      );
    }
  }
  return nodes;
}

export const StreamMarkdown: React.FC<{ content: string; onImageClick?: (url: string) => void }> = React.memo(({ content, onImageClick }) => {
  const tokens = useMemo(() => parseStreamingMarkdown(content || ''), [content]);

  return (
    <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
      {tokens.map((token, index) => {
        if (token.type === 'code-block') {
          return <CodeBlock key={index} language={token.language || ''} code={token.content} />;
        } else if (token.type === 'table') {
            return <MarkdownTable key={index} content={token.content} />;
        }
        return <div key={index}>{parseBlockElements(token.content, index, onImageClick)}</div>;
      })}
    </div>
  );
});