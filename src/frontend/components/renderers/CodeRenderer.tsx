import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check } from 'lucide-react';
import EnrichmentMarkers from '../EnrichmentMarkers';
import type { EnrichmentsResponse } from '../../services/enrichmentApi';

export interface LineSelection {
  start: number;
  end: number;
}

interface CodeRendererProps {
  content: string;
  language: string;
  fileName: string;
  showLineNumbers?: boolean;
  onLineSelect?: (selection: LineSelection) => void;
  selectedLines?: LineSelection | null;
  enrichments?: EnrichmentsResponse;
  onEnrichmentClick?: (enrichmentType: string, enrichmentId: string | number) => void;
}

export default function CodeRenderer({
  content,
  language,
  fileName,
  showLineNumbers = true,
  onLineSelect,
  selectedLines,
  enrichments,
  onEnrichmentClick,
}: CodeRendererProps) {
  const [copied, setCopied] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLineClick = (lineNumber: number, event: React.MouseEvent) => {
    if (!onLineSelect) {
      return;
    }

    if (event.shiftKey && selectionStart !== null) {
      // Range selection with Shift+Click
      const start = Math.min(selectionStart, lineNumber);
      const end = Math.max(selectionStart, lineNumber);
      onLineSelect({ start, end });
    } else {
      // Single line selection
      setSelectionStart(lineNumber);
      onLineSelect({ start: lineNumber, end: lineNumber });
    }
  };

  const isLineSelected = (lineNumber: number): boolean => {
    if (!selectedLines) {
      return false;
    }
    return lineNumber >= selectedLines.start && lineNumber <= selectedLines.end;
  };

  return (
    <div className="relative">
      {/* Header with file name and copy button */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
            {fileName}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Highlight theme={themes.vsLight} code={content} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={className}
              style={{
                ...style,
                margin: 0,
                padding: '1rem',
                backgroundColor: 'var(--bg-primary)',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
            >
              {tokens.map((line, i) => {
                const lineNumber = i + 1;
                const isSelected = isLineSelected(lineNumber);

                return (
                  <div
                    key={i}
                    {...getLineProps({ line })}
                    onClick={e => handleLineClick(lineNumber, e)}
                    style={{
                      display: 'table-row',
                      backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                      cursor: onLineSelect ? 'pointer' : 'default',
                    }}
                    className={onLineSelect ? 'hover:bg-opacity-50' : ''}
                  >
                    {/* Enrichment markers in gutter */}
                    {showLineNumbers && enrichments && (
                      <span
                        style={{
                          display: 'table-cell',
                          textAlign: 'center',
                          paddingRight: '0.5rem',
                          userSelect: 'none',
                          width: '1%',
                        }}
                      >
                        <EnrichmentMarkers
                          enrichments={enrichments}
                          lineNumber={lineNumber}
                          onEnrichmentClick={onEnrichmentClick}
                        />
                      </span>
                    )}

                    {/* Line number */}
                    {showLineNumbers && (
                      <span
                        style={{
                          display: 'table-cell',
                          textAlign: 'right',
                          paddingRight: '1rem',
                          userSelect: 'none',
                          color: isSelected ? '#0066cc' : 'var(--text-tertiary)',
                          width: '1%',
                          fontWeight: isSelected ? 'bold' : 'normal',
                        }}
                      >
                        {lineNumber}
                      </span>
                    )}

                    {/* Code content */}
                    <span style={{ display: 'table-cell' }}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
