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

  const countCommentsRecursively = (comments: any[]): number =>
    comments.reduce(
      (count, comment) =>
        count + 1 + (comment.replies ? countCommentsRecursively(comment.replies) : 0),
      0
    );

  const conflictTitle = (enrichment: any): string => {
    const { firstEnrichment, secondEnrichment } = enrichment.data || {};
    const label = (e: any) => {
      if (!e) {
        return '?';
      }
      if (e.type === 'pr_diff') {
        return `PR #${e.data?.pr_number}`;
      }
      if (e.type === 'commit') {
        return `Commit ${String(e.data?.commit_sha).slice(0, 7)}`;
      }
      if (e.type === 'edit_session') {
        return 'Your edit';
      }
      return e.type;
    };
    return `Conflict: ${label(firstEnrichment)} vs ${label(secondEnrichment)}`;
  };

  const renderLine = (vLine: VirtualLine) => {
    const isDeletion = vLine.diffType === DiffType.DELETION;
    const isAddition = vLine.diffType === DiffType.ADDITION;

    let backgroundColor = 'transparent';
    if (isDeletion) {
      backgroundColor = '#ffdce0';
    } else if (isAddition) {
      backgroundColor = '#cdffd8';
    }

    const commentEnrichments = vLine.enrichments.filter(e => e.type === 'comment');
    const conflictEnrichments = vLine.enrichments.filter(e => e.type === 'conflict');

    const showPRBadge = !!(vLine.prNumber && vLine.isFirstInDiffGroup);
    const showCommitBadge = !!(vLine.commitSha && vLine.isFirstInDiffGroup);
    const showEditBadge = !!(vLine.editId && vLine.isFirstInDiffGroup);

    const hasBadges =
      commentEnrichments.length > 0 ||
      conflictEnrichments.length > 0 ||
      showPRBadge ||
      showCommitBadge ||
      showEditBadge;

    return (
      <div
        key={vLine.virtualLineNumber}
        className="flex items-start hover:bg-gray-50 group"
        style={{ backgroundColor }}
        onClick={() => onLineClick?.(vLine.lineNumber)}
      >
        {/* Line numbers */}
        <div className="flex-shrink-0 flex">
          <div
            className="w-12 px-2 text-right text-xs text-gray-500 select-none border-r border-gray-200"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.isOriginalLine ? vLine.lineNumber : ''}
          </div>
          <div
            className="w-12 px-2 text-right text-xs text-gray-400 select-none border-r border-gray-200"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.virtualLineNumber}
          </div>
        </div>

        {/* Content + inline badges */}
        <div className="flex-1 px-4 py-1 flex items-start gap-4 min-w-0">
          <pre
            className="flex-1 m-0 whitespace-pre-wrap break-words text-sm min-w-0"
            style={{ fontFamily: 'monospace' }}
          >
            {vLine.content}
          </pre>

          {hasBadges && (
            <div className="flex-shrink-0 flex items-center gap-2 pt-0.5">
              {/* Comment badge */}
              {commentEnrichments.length > 0 && (
                <div
                  className="px-1.5 py-0.5 text-xs font-medium rounded-full cursor-pointer"
                  style={{ backgroundColor: '#0066cc', color: '#ffffff' }}
                  onClick={e => {
                    e.stopPropagation();
                    onEnrichmentClick?.(commentEnrichments[0]);
                  }}
                >
                  💬 {countCommentsRecursively(commentEnrichments.map(e => e.data))}
                </div>
              )}

              {/* Conflict badge — generated when hunks from two enrichments overlap */}
              {conflictEnrichments.length > 0 && (
                <div
                  className="px-2 py-0.5 rounded text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #ef4444',
                  }}
                  title={conflictTitle(conflictEnrichments[0])}
                  onClick={e => {
                    e.stopPropagation();
                    onEnrichmentClick?.(conflictEnrichments[0]);
                  }}
                >
                  ⚠️ Conflict
                </div>
              )}

              {/* PR diff badge */}
              {showPRBadge && (
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

              {/* Commit badge */}
              {showCommitBadge && (
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

              {/* Edit badge */}
              {showEditBadge && (
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
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div className="font-mono text-sm">{finalLines.map(renderLine)}</div>;
};
