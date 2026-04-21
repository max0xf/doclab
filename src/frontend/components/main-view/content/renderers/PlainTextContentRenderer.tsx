/**
 * Plain Text Content Renderer
 *
 * Renders layered virtual content as plain text with enrichment badges.
 */

import React from 'react';
import { LayeredVirtualContent, VirtualLine, DiffType } from '../virtual-content/types';

interface PlainTextContentRendererProps {
  virtualContent: LayeredVirtualContent;
  onLineClick?: (lineNumber: number) => void;
  onEnrichmentClick?: (enrichment: any) => void;
}

export const PlainTextContentRenderer: React.FC<PlainTextContentRendererProps> = ({
  virtualContent,
  onLineClick,
  onEnrichmentClick,
}) => {
  const { finalLines } = virtualContent;

  const countCommentsRecursively = (comments: any[]): number => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.replies ? countCommentsRecursively(comment.replies) : 0);
    }, 0);
  };

  const renderLine = (vLine: VirtualLine) => {
    const isDeletion = vLine.diffType === DiffType.DELETION;
    const isAddition = vLine.diffType === DiffType.ADDITION;
    const isModification = false; // No modification type in current system

    // Determine background color
    let backgroundColor = 'transparent';
    if (isDeletion) {
      backgroundColor = '#ffdce0';
    } else if (isAddition) {
      backgroundColor = '#cdffd8';
    } else if (isModification) {
      backgroundColor = '#fff3cd';
    }

    // Check for comments
    const commentEnrichments = vLine.enrichments.filter(e => e.type === 'comment');
    const hasComments = commentEnrichments.length > 0;

    return (
      <div
        key={vLine.virtualLineNumber}
        className="flex items-start hover:bg-gray-50 group relative"
        style={{ backgroundColor }}
        onClick={() => onLineClick?.(vLine.lineNumber)}
      >
        {/* Line numbers */}
        <div className="flex-shrink-0 flex">
          {/* Original line number */}
          <div
            className="w-12 px-2 text-right text-xs text-gray-500 select-none border-r border-gray-200"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.isOriginalLine ? vLine.lineNumber : ''}
          </div>
          {/* Virtual line number */}
          <div
            className="w-12 px-2 text-right text-xs text-gray-400 select-none border-r border-gray-200"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.virtualLineNumber}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-1 relative">
          <pre
            className="m-0 whitespace-pre-wrap break-words text-sm"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.content}
          </pre>

          {/* Badges */}
          <div className="absolute right-2 top-1 flex items-center gap-2">
            {/* Comment Badge */}
            {hasComments && (
              <div
                className="px-1.5 py-0.5 text-xs font-medium rounded-full z-10 cursor-pointer"
                style={{
                  backgroundColor: '#0066cc',
                  color: '#ffffff',
                }}
                onClick={e => {
                  e.stopPropagation();
                  onEnrichmentClick?.(commentEnrichments[0]);
                }}
              >
                💬 {countCommentsRecursively(commentEnrichments.map(e => e.data))}
              </div>
            )}

            {/* PR Diff Badge */}
            {vLine.prNumber && vLine.isFirstInDiffGroup && !vLine.hasConflict && (
              <div
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: isDeletion ? '#ffdce0' : '#cdffd8',
                  color: '#24292e',
                  border: `1px solid ${isDeletion ? '#d73a49' : '#28a745'}`,
                }}
              >
                PR #{vLine.prNumber}
              </div>
            )}

            {/* Commit Badge */}
            {vLine.commitSha && vLine.isFirstInDiffGroup && !vLine.hasConflict && (
              <div
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  border: '1px solid #8b5cf6',
                }}
              >
                📦 Committed
              </div>
            )}

            {/* Edit Badge */}
            {vLine.editId && vLine.isFirstInDiffGroup && !vLine.hasConflict && (
              <div
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  border: '1px solid #3b82f6',
                }}
              >
                ✏️ Your change
              </div>
            )}

            {/* Conflict Badge */}
            {vLine.hasConflict && vLine.isFirstInDiffGroup && (
              <div
                className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #ef4444',
                }}
              >
                ⚠️ Conflict
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return <div className="font-mono text-sm">{finalLines.map(renderLine)}</div>;
};
