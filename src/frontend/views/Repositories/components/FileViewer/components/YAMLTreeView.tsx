/**
 * YAMLTreeView Component
 *
 * Renders YAML content as a collapsible tree structure with enrichments
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MessageSquare, GitPullRequest } from 'lucide-react';
import { UnifiedNode } from '../utils/contentParser';
import { FileComment } from '../../../../../services/commentsApi';

interface YAMLTreeViewProps {
  nodes: UnifiedNode[];
  fileComments: FileComment[];
  onLineClick: (line: number) => void;
  level?: number;
  diffLines?: Set<number>;
  prNumber?: number;
  prTitle?: string;
}

export function YAMLTreeView({
  nodes,
  fileComments,
  onLineClick,
  level = 0,
  diffLines,
  prNumber,
  prTitle,
}: YAMLTreeViewProps) {
  console.log('YAMLTreeView - received fileComments:', fileComments);
  console.log('YAMLTreeView - received nodes:', nodes);
  console.log('YAMLTreeView - received diffLines:', diffLines);

  return (
    <div className="yaml-tree-view font-mono text-sm">
      {nodes.map((node, index) => (
        <YAMLNode
          key={index}
          node={node}
          fileComments={fileComments}
          onLineClick={onLineClick}
          level={level}
          diffLines={diffLines}
          prNumber={prNumber}
          prTitle={prTitle}
        />
      ))}
    </div>
  );
}

interface YAMLNodeProps {
  node: UnifiedNode;
  fileComments: FileComment[];
  onLineClick: (lineNumber: number) => void;
  level: number;
  diffLines?: Set<number>;
  prNumber?: number;
  prTitle?: string;
}

function YAMLNode({
  node,
  fileComments,
  onLineClick,
  level,
  diffLines,
  prNumber,
  prTitle,
}: YAMLNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Auto-expand all levels by default

  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 20;

  // Get line number for this node
  const line = node.position?.start.line || 0;

  // Get change type for this node
  const changeType = node.data?.changeType;

  // Get comments for this node's line
  const nodeComments = node.position
    ? fileComments.filter(c => c.computed_line_number === node.position!.start.line)
    : [];

  // Debug: Log all nodes with their line numbers
  if (node.position) {
    console.log(
      `YAMLNode - level ${level}, line ${node.position.start.line}:`,
      node.data?.key || node.type,
      node.value
    );
  }

  if (nodeComments.length > 0) {
    console.log('YAMLNode - found comments for line', node.position?.start.line, ':', nodeComments);
  }

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.position) {
      onLineClick(node.position.start.line);
    }
  };

  // Determine background color based on enrichments
  const getBackgroundColor = () => {
    const line = node.position?.start.line || 0;
    const nodeComments = fileComments.filter(c => c.computed_line_number === line);
    const hasComment = nodeComments.length > 0;

    console.log(
      `YAMLNode - level ${level}, line ${line}: ${node.data?.key || 'array_item'} ${node.value || ''}`
    );

    if (nodeComments.length > 0) {
      console.log(`YAMLNode - found comments for line ${line} :`, nodeComments);
    }

    // Get structural change type from node metadata
    const changeType = node.data?.changeType;

    console.log(`YAMLNode - changeType for line ${line}:`, changeType);

    let backgroundColor = 'transparent';

    if (hasComment) {
      backgroundColor = '#fff4e5'; // Orange for comments
    } else if (changeType === 'added') {
      backgroundColor = '#e6ffed'; // Green for added nodes
    } else if (changeType === 'deleted') {
      backgroundColor = '#ffeef0'; // Light red for deleted nodes
    } else if (changeType === 'modified') {
      backgroundColor = '#fffbdd'; // Yellow for modified nodes
    } else if (diffLines?.has(line)) {
      backgroundColor = '#e6ffed'; // Green for line-level diffs (fallback)
    }

    return backgroundColor;
  };

  const getBorderLeft = () => {
    const line = node.position?.start.line;
    if (!line) {
      return 'none';
    }

    const nodeComments = fileComments.filter(c => c.computed_line_number === line);
    const hasComment = nodeComments.length > 0;

    // Get structural change type from node metadata
    const changeType = node.data?.changeType;

    console.log(`YAMLNode - found comments for line ${line} :`, nodeComments);
    console.log(`YAMLNode - changeType for line ${line}:`, changeType);

    let borderLeft = 'none';

    if (hasComment) {
      borderLeft = '3px solid #ff9800'; // Orange border for comments
    } else if (changeType === 'added') {
      borderLeft = '3px solid #28a745'; // Green border for added nodes
    } else if (changeType === 'deleted') {
      borderLeft = '3px solid #d73a49'; // Red border for deleted nodes
    } else if (changeType === 'modified') {
      borderLeft = '3px solid #ffc107'; // Yellow border for modified nodes
    } else if (diffLines?.has(line)) {
      borderLeft = '3px solid #28a745'; // Green border for line-level diffs (fallback)
    }

    return borderLeft;
  };

  // Render based on node type
  if (node.type === 'yaml_mapping') {
    return (
      <div className="yaml-mapping">
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 cursor-pointer rounded"
          style={{
            paddingLeft: `${indent}px`,
            backgroundColor: getBackgroundColor(),
            borderLeft: getBorderLeft(),
            textDecoration: node.data?.changeType === 'deleted' ? 'line-through' : 'none',
            opacity: node.data?.changeType === 'deleted' ? 0.7 : 1,
          }}
          onClick={handleToggle}
        >
          {/* Expand/collapse icon */}
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}

          {/* Key */}
          <span className="font-semibold text-blue-700">{node.data?.key}:</span>

          {/* Value (if scalar) */}
          {!hasChildren && node.value !== undefined && (
            <span className="text-gray-700">{node.value}</span>
          )}

          {/* Spacer to push badges to the right */}
          <div className="flex-1" />

          {/* PR Diff badge */}
          {diffLines?.has(line) && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (onLineClick) {
                  onLineClick(line);
                }
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
              title="PR diff line - click to navigate"
            >
              <span>L{line}</span>
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
          {!diffLines?.has(line) && node.position && (
            <span className="text-xs text-gray-400">L{node.position.start.line}</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <YAMLTreeView
            nodes={node.children!}
            fileComments={fileComments}
            onLineClick={onLineClick}
            level={level + 1}
            diffLines={diffLines}
            prNumber={prNumber}
            prTitle={prTitle}
          />
        )}
      </div>
    );
  }

  if (node.type === 'yaml_array_item') {
    return (
      <div className="yaml-array-item">
        <div
          className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 cursor-pointer rounded"
          style={{
            paddingLeft: `${indent}px`,
            backgroundColor: getBackgroundColor(),
            borderLeft: getBorderLeft(),
            textDecoration: node.data?.changeType === 'deleted' ? 'line-through' : 'none',
            opacity: node.data?.changeType === 'deleted' ? 0.7 : 1,
          }}
          onClick={handleToggle}
        >
          {/* Expand/collapse icon */}
          {hasChildren && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </span>
          )}
          {!hasChildren && <span className="w-4" />}

          {/* Array indicator */}
          <span className="text-gray-500">-</span>

          {/* Value (if scalar) */}
          {!hasChildren && node.value !== undefined && (
            <span className="text-gray-700">{node.value}</span>
          )}

          {/* Spacer to push badges to the right */}
          <div className="flex-1" />

          {/* PR Diff badge */}
          {diffLines?.has(line) && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (onLineClick) {
                  onLineClick(line);
                }
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
              title="PR diff line - click to navigate"
            >
              <span>L{line}</span>
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
          {!diffLines?.has(line) && node.position && (
            <span className="text-xs text-gray-400">L{node.position.start.line}</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <YAMLTreeView
            nodes={node.children!}
            fileComments={fileComments}
            onLineClick={onLineClick}
            level={level + 1}
            diffLines={diffLines}
            prNumber={prNumber}
            prTitle={prTitle}
          />
        )}
      </div>
    );
  }

  return null;
}
