
import React from 'react';

// --- Components ---

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language, code }) => (
  <div style={{
    background: '#1e1e1e',
    borderRadius: '8px',
    margin: '8px 0',
    overflow: 'hidden',
    border: '1px solid #333',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }}>
    {/* Mac-style Window Header */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: '#252526',
      borderBottom: '1px solid #333'
    }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
      </div>
      <div style={{ 
        fontSize: '10px', 
        color: '#888', 
        fontFamily: 'sans-serif',
        textTransform: 'uppercase',
        fontWeight: 600
      }}>
        {language || 'CODE'}
      </div>
    </div>
    
    {/* Code Content */}
    <div style={{
      padding: '12px',
      overflowX: 'auto',
      color: '#d4d4d4',
      fontFamily: '"Menlo", "Consolas", "Monaco", monospace',
      fontSize: '13px',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap'
    }}>
      <code>{code}</code>
    </div>
  </div>
));

// --- Parsing Algorithm ---

/**
 * Top-Tier Streaming Markdown Parser
 */
export const StreamMarkdown: React.FC<{ content: string }> = React.memo(({ content }) => {
  if (!content) return null;

  // 1. Split by Code Blocks first
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)(?:```|$)/g;
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.substring(lastIndex, match.index);
      elements.push(...parseBlockElements(textPart, lastIndex));
    }

    elements.push(
      <CodeBlock 
        key={`code-${match.index}`} 
        language={match[1] || 'text'} 
        code={match[2]} 
      />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const textPart = content.substring(lastIndex);
    elements.push(...parseBlockElements(textPart, lastIndex));
  }

  return (
    // Updated: Use standard wrapping to match parent bubble
    <div style={{ overflowWrap: 'break-word', wordBreak: 'normal', lineHeight: '1.6', fontSize: '15px' }}>
      {elements}
    </div>
  );
});

/**
 * Parses block-level elements
 */
function parseBlockElements(text: string, keyOffset: number): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const key = `block-${keyOffset}-${i}`;

    if (!trimmed) {
        nodes.push(<div key={key} style={{ height: '8px' }} />);
        continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={key} style={{ margin: '12px 0 6px 0', fontSize: '16px', fontWeight: 700 }}>{parseInline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={key} style={{ margin: '16px 0 8px 0', fontSize: '18px', fontWeight: 700 }}>{parseInline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={key} style={{ margin: '20px 0 10px 0', fontSize: '20px', fontWeight: 800 }}>{parseInline(trimmed.slice(2))}</h1>);
    } 
    // Lists
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      nodes.push(
        <div key={key} style={{ display: 'flex', marginLeft: '4px', marginBottom: '4px' }}>
          <span style={{ marginRight: '8px', color: 'var(--text-primary)' }}>•</span>
          <span style={{ flex: 1 }}>{parseInline(trimmed.slice(2))}</span>
        </div>
      );
    } 
    // Paragraphs
    else {
      nodes.push(
        <div key={key} style={{ marginBottom: '4px' }}>
          {parseInline(line)}
        </div>
      );
    }
  }

  return nodes;
}

/**
 * Parses inline elements
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  const regex = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  
  const parts = text.split(regex);
  const matches = text.match(regex);
  
  if (!matches) return [text];

  const result: React.ReactNode[] = [];
  let matchIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === undefined) continue;

    if (matches[matchIndex] === part) {
      if (part.startsWith('`')) {
        result.push(
          <span key={i} style={{ 
            background: 'rgba(0,0,0,0.06)', 
            padding: '2px 4px', 
            borderRadius: '4px', 
            fontFamily: 'monospace',
            color: '#d63384',
            fontSize: '0.9em'
          }}>
            {part.slice(1, -1)}
          </span>
        );
      } else if (part.startsWith('[')) {
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          result.push(
            <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#576b95', textDecoration: 'none' }}>
              {linkMatch[1]}
            </a>
          );
        } else {
          result.push(part);
        }
      } else if (part.startsWith('**')) {
        result.push(<strong key={i}>{part.slice(2, -2)}</strong>);
      }
      matchIndex++;
    } else {
      result.push(part);
    }
  }

  return result;
}
