/**
 * MarkdownTreeView Component
 *
 * Renders Markdown content as a structured view with enrichments
 */

import React from 'react';
import { MessageSquare, GitPullRequest } from 'lucide-react';
import { UnifiedNode } from '../utils/contentParser';
import { FileComment } from '../../../../../services/commentsApi';

interface MarkdownTreeViewProps {
  nodes: UnifiedNode[];
  fileComments: FileComment[];
  onLineClick: (line: number) => void;
  diffLines?: Set<number>;
  prNumber?: number;
  prTitle?: string;
}

export function MarkdownTreeView({
  nodes,
  fileComments,
  onLineClick,
  diffLines,
  prNumber,
  prTitle,
}: MarkdownTreeViewProps) {
  console.log('MarkdownTreeView - received fileComments:', fileComments);
  console.log('MarkdownTreeView - received nodes:', nodes);
  console.log('MarkdownTreeView - received diffLines:', diffLines);

  // Group consecutive nodes with the same changeType into blocks
  const groupedBlocks: UnifiedNode[][] = [];
  let currentBlock: UnifiedNode[] = [];
  let currentChangeType: string | undefined = undefined;

  nodes.forEach(node => {
    const nodeChangeType = node.data?.changeType;

    // Start new block if changeType changes or no changeType
    if (nodeChangeType !== currentChangeType || !nodeChangeType) {
      if (currentBlock.length > 0) {
        groupedBlocks.push(currentBlock);
      }
      currentBlock = [node];
      currentChangeType = nodeChangeType;
    } else {
      // Add to current block
      currentBlock.push(node);
    }
  });

  // Push last block
  if (currentBlock.length > 0) {
    groupedBlocks.push(currentBlock);
  }

  return (
    <div className="markdown-tree-view">
      {groupedBlocks.map((block, blockIndex) => (
        <MarkdownBlock
          key={blockIndex}
          nodes={block}
          fileComments={fileComments}
          onLineClick={onLineClick}
          diffLines={diffLines}
          prNumber={prNumber}
          prTitle={prTitle}
        />
      ))}
    </div>
  );
}

interface MarkdownBlockProps {
  nodes: UnifiedNode[];
  fileComments: FileComment[];
  onLineClick: (line: number) => void;
  diffLines?: Set<number>;
  prNumber?: number;
  prTitle?: string;
}

function MarkdownBlock({
  nodes,
  fileComments,
  onLineClick,
  diffLines,
  prNumber,
  prTitle,
}: MarkdownBlockProps) {
  if (nodes.length === 0) {
    return null;
  }

  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  const changeType = firstNode.data?.changeType;

  if (!firstNode.position || !lastNode.position) {
    return (
      <>
        {nodes.map((node, index) => (
          <MarkdownNode
            key={index}
            node={node}
            fileComments={fileComments}
            onLineClick={onLineClick}
            diffLines={diffLines}
            prNumber={prNumber}
            prTitle={prTitle}
          />
        ))}
      </>
    );
  }

  const startLine = firstNode.position.start.line;
  const endLine = lastNode.position.end.line;

  // Get comments for this block's lines
  const blockComments = fileComments.filter(
    c =>
      c.computed_line_number !== null &&
      c.computed_line_number >= startLine &&
      c.computed_line_number <= endLine
  );

  // Determine background color
  let backgroundColor = 'transparent';
  if (blockComments.length > 0) {
    backgroundColor = '#fff4e5'; // Orange for comments
  } else if (changeType === 'added') {
    backgroundColor = '#e6ffed'; // Green for added
  } else if (changeType === 'deleted') {
    backgroundColor = '#ffeef0'; // Light red for deleted
  } else if (changeType === 'modified') {
    backgroundColor = '#fffbdd'; // Yellow for modified
  }

  // Determine border color
  let borderLeft = 'none';
  if (blockComments.length > 0) {
    borderLeft = '3px solid #ff9800';
  } else if (changeType === 'added') {
    borderLeft = '3px solid #28a745';
  } else if (changeType === 'deleted') {
    borderLeft = '3px solid #d73a49';
  } else if (changeType === 'modified') {
    borderLeft = '3px solid #ffc107';
  }

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLineClick(startLine);
  };

  return (
    <div
      className="markdown-block mb-4"
      style={{
        backgroundColor,
        borderLeft,
        borderRadius: '4px',
        padding: '12px',
        cursor: 'pointer',
        textDecoration: changeType === 'deleted' ? 'line-through' : 'none',
        opacity: changeType === 'deleted' ? 0.7 : 1,
      }}
      onClick={() => onLineClick(startLine)}
    >
      {/* Render all nodes in the block */}
      {nodes.map((node, index) => (
        <div key={index} className="markdown-node-content">
          {renderNodeContent(node, node.data?.nodeType || node.type)}
        </div>
      ))}

      {/* Badges at the bottom right of the block */}
      <div className="flex items-center justify-end gap-2 mt-2">
        {/* PR Diff badge */}
        {diffLines?.has(startLine) && (
          <button
            onClick={e => {
              e.stopPropagation();
              onLineClick(startLine);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
            title="PR diff line - click to navigate"
          >
            <span>L{startLine}</span>
          </button>
        )}

        {/* PR Badge with link */}
        {changeType && prNumber && (
          <a
            href={`https://git.acronis.work/projects/REAL/repos/cyber-repo/pull-requests/${prNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
            style={{
              backgroundColor:
                changeType === 'added'
                  ? '#28a745'
                  : changeType === 'deleted'
                    ? '#d73a49'
                    : '#ffc107',
              color: 'white',
              textDecoration: 'none',
            }}
            title={`PR #${prNumber}: ${prTitle || 'View PR'} - Click to open PR`}
          >
            <GitPullRequest size={12} />#{prNumber}
          </a>
        )}

        {/* Comment indicator */}
        {blockComments.length > 0 && (
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
          >
            <MessageSquare size={12} />
            <span>{blockComments.length}</span>
          </button>
        )}

        {/* Line range */}
        {!diffLines?.has(startLine) && (
          <span className="text-xs text-gray-400">
            L{startLine}
            {endLine > startLine && `-${endLine}`}
          </span>
        )}
      </div>
    </div>
  );
}

interface MarkdownNodeProps {
  node: UnifiedNode;
  fileComments: FileComment[];
  onLineClick: (lineNumber: number) => void;
  diffLines?: Set<number>;
  prNumber?: number;
  prTitle?: string;
}

function MarkdownNode({
  node,
  fileComments,
  onLineClick,
  diffLines,
  prNumber,
  prTitle,
}: MarkdownNodeProps) {
  const isExpanded = true; // Always expanded for now

  if (!node.position) {
    return null;
  }

  const startLine = node.position.start.line;
  const endLine = node.position.end.line;
  const changeType = node.data?.changeType;

  // Get comments for this node's lines
  const nodeComments = fileComments.filter(
    c =>
      c.computed_line_number !== null &&
      c.computed_line_number >= startLine &&
      c.computed_line_number <= endLine
  );

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.position) {
      onLineClick(node.position.start.line);
    }
  };

  // Determine background color
  let backgroundColor = 'transparent';
  if (nodeComments.length > 0) {
    backgroundColor = '#fff4e5'; // Orange for comments
  } else if (changeType === 'added') {
    backgroundColor = '#e6ffed'; // Green for added
  } else if (changeType === 'deleted') {
    backgroundColor = '#ffeef0'; // Light red for deleted
  } else if (changeType === 'modified') {
    backgroundColor = '#fffbdd'; // Yellow for modified
  }

  // Determine border color
  let borderLeft = 'none';
  if (nodeComments.length > 0) {
    borderLeft = '3px solid #ff9800';
  } else if (changeType === 'added') {
    borderLeft = '3px solid #28a745';
  } else if (changeType === 'deleted') {
    borderLeft = '3px solid #d73a49';
  } else if (changeType === 'modified') {
    borderLeft = '3px solid #ffc107';
  }

  // Render based on node type
  const nodeType = node.data?.nodeType || node.type;

  return (
    <div
      className="markdown-node mb-4"
      style={{
        backgroundColor,
        borderLeft,
        borderRadius: '4px',
        padding: '12px',
        cursor: 'pointer',
        textDecoration: changeType === 'deleted' ? 'line-through' : 'none',
        opacity: changeType === 'deleted' ? 0.7 : 1,
      }}
      onClick={() => onLineClick(startLine)}
    >
      <div className="flex items-start gap-2">
        {/* Content */}
        <div className="flex-1 min-w-0">{renderNodeContent(node, nodeType)}</div>

        {/* Badges on the right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* PR Diff badge */}
          {diffLines?.has(startLine) && (
            <button
              onClick={e => {
                e.stopPropagation();
                onLineClick(startLine);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
              title="PR diff line - click to navigate"
            >
              <span>L{startLine}</span>
            </button>
          )}

          {/* PR Badge with link */}
          {changeType && prNumber && (
            <a
              href={`https://git.acronis.work/projects/REAL/repos/cyber-repo/pull-requests/${prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 transition-opacity"
              style={{
                backgroundColor:
                  changeType === 'added'
                    ? '#28a745'
                    : changeType === 'deleted'
                      ? '#d73a49'
                      : '#ffc107',
                color: 'white',
                textDecoration: 'none',
              }}
              title={`PR #${prNumber}: ${prTitle || 'View PR'} - Click to open PR`}
            >
              <GitPullRequest size={12} />#{prNumber}
            </a>
          )}

          {/* Comment indicator */}
          {nodeComments.length > 0 && (
            <button
              onClick={handleCommentClick}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              <MessageSquare size={12} />
              <span>{nodeComments.length}</span>
            </button>
          )}

          {/* Line number (only if no diff badge) */}
          {!diffLines?.has(startLine) && (
            <span className="text-xs text-gray-400">
              L{startLine}
              {endLine > startLine && `-${endLine}`}
            </span>
          )}
        </div>
      </div>

      {/* Children (only for lists) */}
      {nodeType === 'list' && node.children && node.children.length > 0 && isExpanded && (
        <div className="mt-2 ml-4">
          {node.children.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              fileComments={fileComments}
              onLineClick={onLineClick}
              diffLines={diffLines}
              prNumber={prNumber}
              prTitle={prTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function renderNodeContent(node: UnifiedNode, nodeType: string): React.ReactNode {
  const value = node.value || '';

  switch (nodeType) {
    case 'heading':
      const depth = (node.data as any)?.depth || 1;
      const HeadingTag = `h${depth}` as keyof JSX.IntrinsicElements;
      return (
        <HeadingTag
          className="font-bold"
          style={{
            fontSize: `${2.5 - depth * 0.25}em`,
            color: 'var(--text-primary)',
            marginBottom: '0.5em',
          }}
        >
          {value}
        </HeadingTag>
      );

    case 'paragraph':
      return (
        <p
          style={{
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            marginBottom: '0.5em',
          }}
        >
          {value}
        </p>
      );

    case 'code':
      return (
        <pre
          className="rounded p-3 overflow-x-auto"
          style={{
            backgroundColor: 'var(--bg-primary)',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          <code style={{ color: 'var(--text-primary)' }}>{value}</code>
        </pre>
      );

    case 'list':
      // List rendering is handled by children
      return null;

    case 'listItem':
      return <li style={{ color: 'var(--text-primary)', marginBottom: '0.25em' }}>{value}</li>;

    case 'blockquote':
      return (
        <blockquote
          style={{
            borderLeft: '4px solid var(--border-color)',
            paddingLeft: '16px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            marginBottom: '0.5em',
          }}
        >
          {value}
        </blockquote>
      );

    case 'thematicBreak':
      return <hr style={{ border: '1px solid var(--border-color)', margin: '1em 0' }} />;

    default:
      return (
        <div style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
          <span className="text-gray-500 text-xs">[{nodeType}]</span> {value}
        </div>
      );
  }
}
