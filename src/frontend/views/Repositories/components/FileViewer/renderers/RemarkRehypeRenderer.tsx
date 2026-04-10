import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageSquare } from 'lucide-react';
import { FileComment } from '../../../../../services/commentsApi';
import { PRDiffData, getDiffTypeForLines, getBlockStyle } from '../types/prDiff';
import { PRBanner } from '../components/PRBanner';
import 'highlight.js/styles/github.css';

interface RemarkRehypeRendererProps {
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: PRDiffData | null;
  onLineClick: (lineNumber: number) => void;
}

export function RemarkRehypeRenderer({
  fileContent,
  fileComments,
  prDiffData,
  onLineClick,
}: RemarkRehypeRendererProps) {
  const [selectedCommentGroup, setSelectedCommentGroup] = useState<number | null>(null);

  const isMarkdownFile = useMemo(() => {
    return fileContent.includes('# ') || fileContent.includes('## ') || fileContent.includes('```');
  }, [fileContent]);

  // Group comments by line number
  const commentsByLine = useMemo(() => {
    const grouped = new Map<number, FileComment[]>();
    fileComments.forEach(comment => {
      const lineNum = comment.computed_line_number;
      if (lineNum !== null) {
        if (!grouped.has(lineNum)) {
          grouped.set(lineNum, []);
        }
        grouped.get(lineNum)!.push(comment);
      }
    });
    return grouped;
  }, [fileComments]);

  if (!isMarkdownFile) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            Remark/Rehype rendering is only available for Markdown files.
          </p>
          <pre
            className="mt-4 p-4 rounded"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {fileContent}
          </pre>
        </div>
      </div>
    );
  }

  // Render comment indicators and overlays
  const renderWithComments = () => {
    const lines = fileContent.split('\n');
    const contentBlocks: JSX.Element[] = [];
    let currentBlockLines: string[] = [];
    let blockStartLine = 1;

    const flushBlock = (endLine: number) => {
      if (currentBlockLines.length === 0) {
        return;
      }

      const blockContent = currentBlockLines.join('\n');

      // Capture the current blockStartLine value for this block
      const currentBlockStartLine = blockStartLine;

      // Build map of line numbers to comments for this block
      const lineCommentsMap = new Map<number, FileComment[]>();
      for (let i = currentBlockStartLine; i <= endLine; i++) {
        const lineComments = commentsByLine.get(i);
        if (lineComments) {
          lineCommentsMap.set(i, lineComments);
        }
      }

      const hasComments = lineCommentsMap.size > 0;
      const blockKey = `block-${currentBlockStartLine}-${endLine}`;

      // Determine diff type for this block
      const diffType = getDiffTypeForLines(currentBlockStartLine, endLine, prDiffData);
      const hasDiff = diffType !== undefined;
      const blockStyle = getBlockStyle(hasComments, diffType);

      contentBlocks.push(
        <div
          key={blockKey}
          className="relative"
          style={{
            marginBottom: '1em',
            borderLeft: blockStyle.borderLeft,
            backgroundColor: blockStyle.backgroundColor,
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onClick={() => {
            // Click on block to add comment at the start line
            console.log('Block clicked:', {
              blockKey,
              blockStartLine: currentBlockStartLine,
              blockContent: blockContent.substring(0, 50) + '...',
            });
            onLineClick(currentBlockStartLine);
          }}
          onMouseEnter={e => {
            if (!hasComments) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseLeave={e => {
            if (!hasComments) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* PR Banner */}
          {hasDiff && prDiffData && prDiffData.prNumber && (
            <PRBanner
              prNumber={prDiffData.prNumber}
              prTitle={prDiffData.prTitle || 'Pull Request'}
              prAuthor={prDiffData.prAuthor}
              diffType={diffType}
            />
          )}

          {/* Render line-by-line with inline comment indicators */}
          <div style={{ textDecoration: diffType === 'deleted' ? 'line-through' : 'none' }}>
            {currentBlockLines.map((line, idx) => {
              const lineNum = currentBlockStartLine + idx;
              const lineHasComments = lineCommentsMap.has(lineNum);
              const lineComments = lineCommentsMap.get(lineNum) || [];

              return (
                <div
                  key={`line-${lineNum}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    minHeight: '20px',
                    position: 'relative',
                  }}
                >
                  {/* Line content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={markdownComponents as any}
                    >
                      {line}
                    </ReactMarkdown>
                  </div>

                  {/* Inline comment indicator */}
                  {lineHasComments && (
                    <div
                      style={{
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        const newValue = selectedCommentGroup === lineNum ? null : lineNum;
                        setSelectedCommentGroup(newValue);
                        if (newValue !== null) {
                          onLineClick(lineNum);
                        }
                      }}
                    >
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded"
                        style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>{lineComments.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasComments &&
            selectedCommentGroup !== null &&
            lineCommentsMap.has(selectedCommentGroup) && (
              <div
                className="mt-3 pt-3 border-t"
                style={{
                  borderColor: '#ff9800',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#e65100',
                  }}
                >
                  Comments on line {selectedCommentGroup}
                </div>
                {lineCommentsMap.get(selectedCommentGroup)!.map((comment, idx) => (
                  <div
                    key={comment.id || idx}
                    className="mb-3 p-3 rounded"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {comment.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-medium"
                            style={{ fontSize: '13px', color: 'var(--text-primary)' }}
                          >
                            {comment.user?.username || 'Unknown'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Line {comment.computed_line_number}
                          </span>
                          {comment.anchoring_status && comment.anchoring_status !== 'anchored' && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor:
                                  comment.anchoring_status === 'moved'
                                    ? '#e3f2fd'
                                    : comment.anchoring_status === 'outdated'
                                      ? '#fff3cd'
                                      : '#ffebe9',
                                color:
                                  comment.anchoring_status === 'moved'
                                    ? '#1976d2'
                                    : comment.anchoring_status === 'outdated'
                                      ? '#856404'
                                      : '#d73a49',
                              }}
                            >
                              {comment.anchoring_status}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {comment.comment_text}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      );

      currentBlockLines = [];
    };

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Detect block boundaries
      const isHeading = line.startsWith('#');
      const isEmpty = !line.trim();
      const isCodeFence = line.startsWith('```');

      // Start new block on heading or code fence
      if ((isHeading || isCodeFence) && currentBlockLines.length > 0) {
        flushBlock(lineNum - 1);
        currentBlockLines = [];
        blockStartLine = lineNum;
      }

      // Add line to current block
      currentBlockLines.push(line);

      // End block on empty line (but keep the empty line in the block)
      if (isEmpty && currentBlockLines.length > 1) {
        flushBlock(lineNum);
        currentBlockLines = [];
        blockStartLine = lineNum + 1;
      }
    });

    // Flush remaining block
    if (currentBlockLines.length > 0) {
      flushBlock(lines.length);
    }

    return contentBlocks;
  };

  const markdownComponents = {
    /* eslint-disable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content */
    /* eslint-disable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content */
    h1: ({ node: _node, ...props }) => (
      <h1
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-color)',
          marginTop: '1.5em',
          marginBottom: '0.75em',
          paddingBottom: '0.3em',
          fontSize: '2em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h2: ({ node: _node, ...props }) => (
      <h2
        style={{
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border-color)',
          marginTop: '1.5em',
          marginBottom: '0.75em',
          paddingBottom: '0.3em',
          fontSize: '1.5em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h3: ({ node: _node, ...props }) => (
      <h3
        style={{
          color: 'var(--text-primary)',
          marginTop: '1.5em',
          marginBottom: '0.5em',
          fontSize: '1.25em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h4: ({ node: _node, ...props }) => (
      <h4
        style={{
          color: 'var(--text-primary)',
          marginTop: '1em',
          marginBottom: '0.5em',
          fontSize: '1.1em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h5: ({ node: _node, ...props }) => (
      <h5
        style={{
          color: 'var(--text-primary)',
          marginTop: '1em',
          marginBottom: '0.5em',
          fontSize: '1em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    h6: ({ node: _node, ...props }) => (
      <h6
        style={{
          color: 'var(--text-primary)',
          marginTop: '1em',
          marginBottom: '0.5em',
          fontSize: '0.9em',
          fontWeight: 600,
        }}
        {...props}
      />
    ),
    p: ({ node: _node, ...props }) => (
      <p style={{ color: 'var(--text-primary)', marginBottom: '1em' }} {...props} />
    ),
    a: ({ node: _node, ...props }) => (
      <a
        style={{
          color: 'var(--primary)',
          textDecoration: 'underline',
        }}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    code: ({ node: _node, ...props }: any) =>
      props.inline ? (
        <code
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--primary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.9em',
          }}
          {...props}
        />
      ) : (
        <code
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            display: 'block',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            overflowX: 'auto',
          }}
          {...props}
        />
      ),
    pre: ({ node: _node, ...props }) => (
      <pre
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '6px',
          padding: '0',
          margin: '16px 0',
        }}
        {...props}
      />
    ),
    blockquote: ({ node: _node, ...props }) => (
      <blockquote
        style={{
          borderLeft: '4px solid var(--border-color)',
          paddingLeft: '16px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}
        {...props}
      />
    ),
    table: ({ node: _node, ...props }) => (
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            border: '1px solid var(--border-color)',
          }}
          {...props}
        />
      </div>
    ),
    th: ({ node: _node, ...props }) => (
      <th
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '8px 12px',
          border: '1px solid var(--border-color)',
          textAlign: 'left',
        }}
        {...props}
      />
    ),
    td: ({ node: _node, ...props }) => (
      <td
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        }}
        {...props}
      />
    ),
    ul: ({ node: _node, ...props }) => (
      <ul
        style={{
          color: 'var(--text-primary)',
          marginBottom: '1em',
          paddingLeft: '2em',
        }}
        {...props}
      />
    ),
    ol: ({ node: _node, ...props }) => (
      <ol
        style={{
          color: 'var(--text-primary)',
          marginBottom: '1em',
          paddingLeft: '2em',
        }}
        {...props}
      />
    ),
    li: ({ node: _node, ...props }) => (
      <li
        style={{
          color: 'var(--text-primary)',
          marginBottom: '0.25em',
        }}
        {...props}
      />
    ),
    /* eslint-enable jsx-a11y/heading-has-content, jsx-a11y/anchor-has-content */
  };

  return (
    <div className="p-6">
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        {fileComments.length > 0 && (
          <div
            className="mb-4 p-3 rounded-md flex items-center gap-2"
            style={{
              backgroundColor: '#fff4e5',
              border: '1px solid #ff9800',
            }}
          >
            <MessageSquare size={16} style={{ color: '#ff9800' }} />
            <span style={{ fontSize: '13px', color: '#e65100', fontWeight: 500 }}>
              {fileComments.length} comment{fileComments.length > 1 ? 's' : ''} on this document
            </span>
            <span style={{ fontSize: '12px', color: '#856404' }}>
              • Click comment indicators to view
            </span>
          </div>
        )}
        <div
          className="prose prose-sm max-w-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: '1.7',
          }}
        >
          {renderWithComments()}
        </div>
      </div>
    </div>
  );
}
