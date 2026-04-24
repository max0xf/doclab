import React, { useState, useRef, useEffect } from 'react';
import { Pencil, GitCommit, AlertTriangle } from 'lucide-react';
import {
  Enrichment,
  LayeredVirtualContent,
  VirtualLine,
  DiffType,
  EnrichmentType,
} from '../virtual-content/types';
import { ConflictDetailsDialog } from './ConflictDetailsDialog';

interface PlainTextContentRendererProps {
  virtualContent: LayeredVirtualContent;
  onLineClick?: (lineNumber: number) => void;
  onEnrichmentClick?: (enrichment: any) => void;
  isEditMode?: boolean;
  onLineContentChange?: (virtualLineNumber: number, newContent: string) => void;
}

// Editable line component used in edit mode.
// Manages its own DOM via a ref so React never overwrites the user's typed content
// between re-renders (React has no children to reconcile against).
function EditableLine({
  content,
  virtualLineNumber,
  className,
  style,
  onContentChange,
}: {
  content: string;
  virtualLineNumber: number;
  className?: string;
  style?: React.CSSProperties;
  onContentChange: (virtualLineNumber: number, newContent: string) => void;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const isEditingRef = useRef(false);

  // Set initial content imperatively on mount; don't overwrite while user is typing.
  useEffect(() => {
    if (ref.current && !isEditingRef.current) {
      ref.current.innerText = content;
    }
  }, [content]);

  return (
    <pre
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{ ...style, outline: 'none', cursor: 'text', minHeight: '1.2em' }}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={() => {
        isEditingRef.current = false;
      }}
      onInput={e => {
        // Browsers add a trailing newline to contenteditable for cursor positioning;
        // strip it so a single Enter doesn't introduce a double blank line.
        const text = e.currentTarget.innerText.replace(/\n$/, '');
        onContentChange(virtualLineNumber, text);
      }}
    />
  );
}

export const PlainTextContentRenderer: React.FC<PlainTextContentRendererProps> = ({
  virtualContent,
  onLineClick,
  onEnrichmentClick,
  isEditMode,
  onLineContentChange,
}) => {
  const [conflictDialog, setConflictDialog] = useState<{
    conflicts: Enrichment[];
    initialIndex: number;
  } | null>(null);

  const { finalLines } = virtualContent;

  const countCommentsRecursively = (comments: any[]): number =>
    comments.reduce(
      (count, comment) =>
        count + 1 + (comment.replies ? countCommentsRecursively(comment.replies) : 0),
      0
    );

  const renderLine = (vLine: VirtualLine) => {
    const isDeletion = vLine.diffType === DiffType.DELETION;
    const isAddition = vLine.diffType === DiffType.ADDITION;

    const commentEnrichments = vLine.enrichments.filter(e => e.type === 'comment');
    const conflictEnrichments = vLine.enrichments.filter(e => e.type === 'conflict');
    const firstLineConflicts = conflictEnrichments.filter(ce => vLine.lineNumber === ce.lineStart);

    let backgroundColor = 'transparent';
    if (conflictEnrichments.length > 0) {
      backgroundColor = '#fff7ed';
    } else if (isDeletion) {
      backgroundColor = '#ffdce0';
    } else if (isAddition) {
      backgroundColor = '#cdffd8';
    }

    const showPRBadge = !!(vLine.prNumber && vLine.isFirstInDiffGroup);
    const showCommitBadge = !!(vLine.commitSha && vLine.isFirstInDiffGroup);
    const showEditBadge = !!(vLine.editId && vLine.isFirstInDiffGroup);

    const hasBadges =
      commentEnrichments.length > 0 ||
      firstLineConflicts.length > 0 ||
      showPRBadge ||
      showCommitBadge ||
      showEditBadge;

    // A line is editable in edit mode when it contributes to the draft modified content:
    // original lines that weren't deleted, and lines added by the edit_session enrichment.
    const isEditable = !!(
      isEditMode &&
      !isDeletion &&
      (!vLine.isInsertedLine || vLine.sourceEnrichment?.type === EnrichmentType.EDIT)
    );

    return (
      <div
        key={vLine.virtualLineNumber}
        className="flex items-start group"
        style={{
          backgroundColor,
          // Subtle hover only when not editable (editable lines use cursor:text)
          cursor: isEditable ? 'text' : undefined,
        }}
        onClick={!isEditMode ? () => onLineClick?.(vLine.lineNumber) : undefined}
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
          {isEditable ? (
            <EditableLine
              content={vLine.content}
              virtualLineNumber={vLine.virtualLineNumber}
              className="flex-1 m-0 whitespace-pre-wrap break-words text-sm min-w-0"
              style={{ fontFamily: 'monospace' }}
              onContentChange={onLineContentChange!}
            />
          ) : (
            <pre
              className="flex-1 m-0 whitespace-pre-wrap break-words text-sm min-w-0"
              style={{ fontFamily: 'monospace' }}
            >
              {vLine.content}
            </pre>
          )}

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

              {/* Conflict badge — single icon on the first line of each conflict block */}
              {firstLineConflicts.length > 0 && (
                <button
                  className="flex items-center justify-center gap-0.5 rounded"
                  style={{
                    minWidth: 22,
                    height: 22,
                    paddingLeft: firstLineConflicts.length > 1 ? 5 : 0,
                    paddingRight: firstLineConflicts.length > 1 ? 5 : 0,
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #ef4444',
                    cursor: 'pointer',
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title={`${firstLineConflicts.length} conflict${firstLineConflicts.length > 1 ? 's' : ''} — click to review`}
                  onClick={e => {
                    e.stopPropagation();
                    setConflictDialog({ conflicts: firstLineConflicts, initialIndex: 0 });
                  }}
                >
                  <AlertTriangle size={12} />
                  {firstLineConflicts.length > 1 && (
                    <span style={{ lineHeight: 1 }}>{firstLineConflicts.length}</span>
                  )}
                </button>
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

              {/* Commit badge — icon only */}
              {showCommitBadge && (
                <div
                  className="flex items-center justify-center rounded"
                  title="Committed to branch"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: '#f3e8ff',
                    color: '#7c3aed',
                    border: '1px solid #8b5cf6',
                    flexShrink: 0,
                  }}
                >
                  <GitCommit size={12} />
                </div>
              )}

              {/* Edit badge — pencil icon only, opens Changes tab */}
              {showEditBadge && (
                <button
                  className="flex items-center justify-center rounded"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    border: '1px solid #3b82f6',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title="Your draft change — click to view in Changes tab"
                  onClick={e => {
                    e.stopPropagation();
                    onEnrichmentClick?.({
                      type: 'edit',
                      id: vLine.editId || '',
                      data: {},
                    } as Enrichment);
                  }}
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="font-mono text-sm">{finalLines.map(renderLine)}</div>
      {conflictDialog && (
        <ConflictDetailsDialog
          conflicts={conflictDialog.conflicts}
          initialIndex={conflictDialog.initialIndex}
          onClose={() => setConflictDialog(null)}
        />
      )}
    </>
  );
};
