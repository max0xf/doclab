import React, { useState, useEffect } from 'react';
import { ContentWidgetProps, VirtualLine, Enrichment } from './types';

/**
 * PlainTextContentWidget
 *
 * Displays plain text with line numbers and enrichments.
 * Supports both view and edit modes.
 * Implements VirtualContent approach - original content enriched by enrichments.
 */
// Helper function to count comments recursively including replies
// Enrichment API now returns nested structure with replies field
function countCommentsRecursively(comments: any[]): number {
  return comments.reduce((total, comment) => {
    const repliesCount = comment.replies ? countCommentsRecursively(comment.replies) : 0;
    return total + 1 + repliesCount;
  }, 0);
}

export function PlainTextContentWidget({
  fileName: _fileName,
  content,
  enrichments,
  isEditMode,
  onContentChange,
  onLineClick,
  onEnrichmentClick,
}: ContentWidgetProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [virtualLines, setVirtualLines] = useState<VirtualLine[]>([]);

  // Build virtual lines (original content + enrichments with inserted diff lines)
  useEffect(() => {
    const lines = content.split('\n');
    const virtual: VirtualLine[] = [];

    // Build a map of line number -> enrichments for quick lookup
    const lineEnrichmentsMap = new Map<number, Enrichment[]>();
    enrichments.forEach(e => {
      for (let line = e.lineStart; line <= e.lineEnd; line++) {
        if (!lineEnrichmentsMap.has(line)) {
          lineEnrichmentsMap.set(line, []);
        }
        lineEnrichmentsMap.get(line)!.push(e);
      }
    });

    // Track which hunks have been processed to avoid duplicates
    const processedHunks = new Set<string>();

    // Process each line of original content
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineEnrichments = lineEnrichmentsMap.get(lineNumber) || [];

      // Get PR diff enrichments sorted by PR number (oldest first)
      const prDiffEnrichments = lineEnrichments
        .filter(e => e.type === 'pr_diff')
        .sort((a, b) => {
          const prA = (a.data as any).pr_number || 0;
          const prB = (b.data as any).pr_number || 0;
          return prA - prB;
        });

      // Add the original line from the file
      virtual.push({
        lineNumber,
        virtualLineNumber: virtual.length + 1,
        content: line,
        enrichments: lineEnrichments,
        isEnrichmentLine: false,
      });

      // For each PR diff enrichment, check if we need to insert diff changes after this line
      prDiffEnrichments.forEach(prEnrichment => {
        const prData = prEnrichment.data as any;
        const hunk = prData.current_hunk;

        if (!hunk || !hunk.lines) {
          return;
        }

        // Create unique key for this hunk to track if we've processed it
        const hunkKey = `${prData.pr_number}-${hunk.old_start}-${hunk.old_count}`;

        // Find the first line in the original file where this hunk starts
        // This is where we should insert the diff changes
        const hunkStartLine = hunk.old_start;

        // Only process this hunk if:
        // 1. We haven't processed it yet
        // 2. We're at the first line of the hunk
        if (processedHunks.has(hunkKey) || lineNumber !== hunkStartLine) {
          return;
        }

        // Mark this hunk as processed
        processedHunks.add(hunkKey);

        // Collect all changes from this hunk
        const changesToInsert: Array<{
          content: string;
          type: 'addition' | 'deletion';
          isFirstInGroup: boolean;
        }> = [];
        let lastChangeType: 'addition' | 'deletion' | null = null;

        for (const hunkLine of hunk.lines) {
          const prefix = hunkLine[0];

          if (prefix === '-') {
            // Deletion
            const isFirstInGroup = lastChangeType !== 'deletion';
            changesToInsert.push({
              content: hunkLine.substring(1),
              type: 'deletion',
              isFirstInGroup,
            });
            lastChangeType = 'deletion';
          } else if (prefix === '+') {
            // Addition
            const isFirstInGroup = lastChangeType !== 'addition';
            changesToInsert.push({
              content: hunkLine.substring(1),
              type: 'addition',
              isFirstInGroup,
            });
            lastChangeType = 'addition';
          }
          // Skip context lines - they're already in the original content
        }

        // Insert all collected changes as virtual lines
        changesToInsert.forEach(change => {
          virtual.push({
            lineNumber: lineNumber,
            virtualLineNumber: virtual.length + 1,
            content: change.content,
            enrichments: [prEnrichment],
            isEnrichmentLine: true,
            diffType: change.type,
            prNumber: prData.pr_number,
            prTitle: prData.pr_title,
            isFirstInDiffGroup: change.isFirstInGroup,
          });
        });
      });
    });

    setVirtualLines(virtual);
  }, [content, enrichments]);

  // Sync edited content when content prop changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditedContent(newContent);
    onContentChange?.(newContent);
  };

  const handleLineClick = (lineNumber: number) => {
    if (!isEditMode) {
      onLineClick?.(lineNumber);
    }
  };

  if (isEditMode) {
    // Edit Mode: Textarea
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <textarea
          value={editedContent}
          onChange={handleContentChange}
          className="flex-1 font-mono text-sm p-4 resize-none focus:outline-none"
          style={{
            backgroundColor: '#ffffff',
            color: 'var(--text-primary)',
            lineHeight: '1.5',
          }}
          spellCheck={false}
        />
      </div>
    );
  }

  // View Mode: Line-by-line with enrichments
  return (
    <div className="flex-1 overflow-auto">
      <div
        className="font-mono text-sm"
        style={{
          backgroundColor: '#f8f9fa',
        }}
      >
        {virtualLines.map(vLine => {
          const hasComments = vLine.enrichments.some(e => e.type === 'comment');
          const hasNonCommentEnrichments = vLine.enrichments.some(
            e => e.type !== 'pr_diff' && e.type !== 'comment'
          ); // Exclude PR diffs and comments from gutter markers
          const isDeletion = vLine.diffType === 'deletion';
          const isAddition = vLine.diffType === 'addition';

          // Determine background color
          let backgroundColor: string | undefined = undefined;
          if (isDeletion) {
            backgroundColor = '#ffeef0'; // Light red for deletions
          } else if (isAddition) {
            backgroundColor = '#e6ffed'; // Light green for additions
          } else if (hasComments) {
            backgroundColor = '#e7f3ff'; // Light blue for comments
          }

          return (
            <div
              key={vLine.virtualLineNumber}
              className="flex hover:opacity-90 transition-opacity cursor-pointer"
              onClick={() => !vLine.isEnrichmentLine && handleLineClick(vLine.lineNumber)}
              style={{
                backgroundColor,
              }}
            >
              {/* Original Line Number */}
              <div
                className="flex-shrink-0 py-1 text-right select-none border-r"
                style={{
                  minWidth: '36px',
                  paddingLeft: '2px',
                  paddingRight: '4px',
                  fontSize: '11px',
                  color: vLine.isEnrichmentLine ? '#d73a49' : 'var(--text-secondary)',
                  borderColor: 'var(--border-color)',
                  backgroundColor: isDeletion ? '#ffdce0' : 'var(--bg-secondary)',
                }}
              >
                {vLine.isEnrichmentLine ? '-' : vLine.lineNumber}
              </div>

              {/* Virtual Line Number */}
              <div
                className="flex-shrink-0 py-1 text-right select-none border-r"
                style={{
                  minWidth: '36px',
                  paddingLeft: '2px',
                  paddingRight: '4px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-color)',
                  backgroundColor: isDeletion
                    ? '#ffdce0'
                    : isAddition
                      ? '#cdffd8'
                      : 'var(--bg-secondary)',
                }}
              >
                {vLine.virtualLineNumber}
              </div>

              {/* Enrichment Marker Gutter */}
              <div className="flex-shrink-0 w-8 px-1 py-1 flex items-center justify-center">
                {hasNonCommentEnrichments && !vLine.isEnrichmentLine && (
                  <div
                    className="w-3 h-3 rounded-full cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: '#4caf50',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (vLine.enrichments[0]) {
                        onEnrichmentClick?.(vLine.enrichments[0]);
                      }
                    }}
                    title={`${vLine.enrichments.filter(e => e.type !== 'comment' && e.type !== 'pr_diff').length} enrichment(s)`}
                  />
                )}
              </div>

              {/* Line Content */}
              <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-all relative">
                {vLine.content || ' '}

                {/* Comment Badge */}
                {hasComments && (
                  <div
                    className="absolute right-2 top-0 px-1.5 py-0.5 text-xs font-medium rounded-full z-10"
                    style={{
                      backgroundColor: '#0066cc',
                      color: '#ffffff',
                    }}
                  >
                    💬{' '}
                    {countCommentsRecursively(
                      vLine.enrichments.filter(e => e.type === 'comment').map(e => e.data)
                    )}
                  </div>
                )}

                {/* PR Diff Badge - show only on first line of each diff group (hunk) */}
                {vLine.prNumber && vLine.isFirstInDiffGroup && (
                  <div
                    className="absolute right-2 top-1 flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: isDeletion ? '#ffdce0' : '#cdffd8',
                      color: '#24292e',
                      border: `1px solid ${isDeletion ? '#d73a49' : '#28a745'}`,
                    }}
                  >
                    PR #{vLine.prNumber}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
