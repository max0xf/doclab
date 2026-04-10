import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LineRenderer } from '../LineRenderer';
import { FileComment } from '../../../../../services/commentsApi';

interface ChangeChunk {
  startLine: number;
  endLine: number;
  type: 'add' | 'delete';
}

interface PlainTextRendererProps {
  fileContent: string;
  fileComments: FileComment[];
  enrichments: any[]; // Unified enrichments array
  onLineClick: (lineNumber: number) => void;
  isEditable?: boolean;
  onLineEdit?: (lineIndex: number, newContent: string) => void;
}

interface EphemeralLine {
  content: string;
  newLineNumber: number | null; // null for deleted lines
  oldLineNumber: number | null; // null for added lines
  changeType: 'add' | 'delete' | 'context' | null;
}

export function PlainTextRenderer({
  fileContent,
  fileComments,
  enrichments,
  onLineClick,
  isEditable = false,
  onLineEdit,
}: PlainTextRendererProps) {
  const [changeChunks, setChangeChunks] = useState<ChangeChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get all diff enrichments sorted by priority (higher priority wins conflicts)
  // We should render ALL enrichments together, not just one
  // Memoize to prevent infinite loops in useEffect
  const diffEnrichments = useMemo(
    () => enrichments.filter(e => e.category === 'diff').sort((a, b) => b.priority - a.priority),
    [enrichments]
  );

  // For now, use the highest priority one for rendering
  // TODO: Merge all enrichments with conflict resolution
  const activeDiffEnrichment = diffEnrichments[0];
  const activeDiff = activeDiffEnrichment?.data;

  // Build ephemeral content by merging ALL diff enrichments
  // IMPORTANT: fileContent MUST be the original repository content (not PR-modified)
  // All diffs are applied as deltas on top of this original content
  // When lines conflict, higher priority wins (tracked for warning badges)
  const buildEphemeralContent = useCallback((): EphemeralLine[] => {
    if (diffEnrichments.length === 0) {
      // No diffs, just return base content
      return fileContent.split('\n').map((line, index) => ({
        content: line,
        newLineNumber: index + 1,
        oldLineNumber: index + 1,
        changeType: null,
      }));
    }

    // Step 1: Collect all changes (add/delete) from all enrichments
    const allChanges: Array<{
      type: 'add' | 'delete';
      content: string;
      oldLineNumber: number | null;
      enrichmentType: string;
      insertAfterOldLine: number; // Position in original file where this change applies
    }> = [];

    for (const enrichment of diffEnrichments) {
      const diff = enrichment.data;
      if (!diff || !diff.hunks) {
        continue;
      }

      for (const hunk of diff.hunks) {
        if (!Array.isArray(hunk.lines)) {
          continue;
        }

        // Track position in original file as we process hunk lines
        let currentOldLine = hunk.old_start - 1;

        for (const line of hunk.lines) {
          if (line.type === 'delete') {
            allChanges.push({
              type: 'delete',
              content: line.content,
              oldLineNumber: line.old_line_number,
              enrichmentType: enrichment.type,
              insertAfterOldLine: currentOldLine,
            });
            currentOldLine++; // Deletes consume a line from original
          } else if (line.type === 'add') {
            allChanges.push({
              type: 'add',
              content: line.content,
              oldLineNumber: null,
              enrichmentType: enrichment.type,
              insertAfterOldLine: currentOldLine,
            });
            // Adds don't consume original lines
          } else {
            // Context line - skip, but advance position
            currentOldLine++;
          }
        }
      }
    }

    // Step 2: Sort changes by original file position
    allChanges.sort((a, b) => a.insertAfterOldLine - b.insertAfterOldLine);

    // Step 3: Build ephemeral content by applying changes to base content
    const ephemeralLines: any[] = [];
    const baseLines = fileContent.split('\n');
    let baseLineIndex = 0;

    for (const change of allChanges) {
      // Add all base lines up to the change position
      while (baseLineIndex < change.insertAfterOldLine) {
        ephemeralLines.push({
          content: baseLines[baseLineIndex],
          newLineNumber: null,
          oldLineNumber: baseLineIndex + 1,
          changeType: null,
          enrichmentType: null,
        });
        baseLineIndex++;
      }

      // Apply the change
      if (change.type === 'delete') {
        ephemeralLines.push({
          content: change.content,
          newLineNumber: null,
          oldLineNumber: change.oldLineNumber,
          changeType: 'delete',
          enrichmentType: change.enrichmentType,
        });
        baseLineIndex++; // Skip the deleted line in base content
      } else {
        ephemeralLines.push({
          content: change.content,
          newLineNumber: null,
          oldLineNumber: null,
          changeType: 'add',
          enrichmentType: change.enrichmentType,
        });
      }
    }

    // Add remaining base lines
    while (baseLineIndex < baseLines.length) {
      ephemeralLines.push({
        content: baseLines[baseLineIndex],
        newLineNumber: null,
        oldLineNumber: baseLineIndex + 1,
        changeType: null,
        enrichmentType: null,
      });
      baseLineIndex++;
    }

    // Step 4: Assign final line numbers
    let newLineNum = 1;
    for (const line of ephemeralLines) {
      if (line.changeType !== 'delete') {
        line.newLineNumber = newLineNum++;
      }
    }

    return ephemeralLines;
  }, [fileContent, diffEnrichments]);

  // Build ephemeral content (memoized to prevent infinite loops)
  const ephemeralLines = useMemo(() => buildEphemeralContent(), [buildEphemeralContent]);

  useEffect(() => {
    if (!activeDiff || !activeDiff.hunks) {
      setChangeChunks([]);
      setCurrentChunkIndex(0);
      return;
    }

    const chunks: ChangeChunk[] = [];

    // Build chunks from ephemeral lines (which include all changes)
    // Group contiguous changes from the same enrichment
    for (let i = 0; i < ephemeralLines.length; i++) {
      const ephLine = ephemeralLines[i] as any;
      const lineNumber = ephLine.newLineNumber || ephLine.oldLineNumber || i + 1;
      const changeType = ephLine.changeType;
      const enrichmentType = ephLine.enrichmentType;

      if (changeType && (changeType === 'add' || changeType === 'delete') && enrichmentType) {
        const prevChunk = chunks[chunks.length - 1];

        // Look for previous changed line's enrichment type
        let prevEnrichmentType: string | null = null;
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = ephemeralLines[j] as any;
          if (prevLine.changeType === 'add' || prevLine.changeType === 'delete') {
            prevEnrichmentType = prevLine.enrichmentType;
            break;
          }
        }

        // Group contiguous changes from same enrichment
        if (prevChunk && prevEnrichmentType && enrichmentType === prevEnrichmentType) {
          // Extend existing chunk
          prevChunk.endLine = lineNumber;
        } else {
          // Start new chunk
          chunks.push({ startLine: lineNumber, endLine: lineNumber, type: changeType });
        }
      }
    }

    setChangeChunks(chunks);
    setCurrentChunkIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiff, fileContent, diffEnrichments, ephemeralLines]);

  const navigateToChunk = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'prev'
        ? Math.max(0, currentChunkIndex - 1)
        : Math.min(changeChunks.length - 1, currentChunkIndex + 1);

    setCurrentChunkIndex(newIndex);

    const chunk = changeChunks[newIndex];
    if (chunk && contentRef.current) {
      const lineElement = contentRef.current.querySelector(
        `[data-line-number="${chunk.startLine}"]`
      );
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto" ref={contentRef}>
      <div className="p-6">
        <div
          className="rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            maxWidth: '100%',
          }}
        >
          {ephemeralLines.map((ephLine, index) => {
            const lineNumber = ephLine.newLineNumber || index + 1;
            const displayOldLine = ephLine.oldLineNumber;
            const displayNewLine = ephLine.newLineNumber;
            const changeType = ephLine.changeType === 'context' ? null : ephLine.changeType;

            const lineCommentsForLine = fileComments.filter(
              c => c.computed_line_number === lineNumber
            );
            const hasComments = lineCommentsForLine.length > 0;

            // Check if this is the first line of a PR diff block
            const isFirstLineOfBlock = false; // TODO: implement

            // Check if this is a chunk start for navigation
            // A line is a chunk start if its line number matches the chunk's startLine
            const chunkIndex = changeChunks.findIndex(chunk => chunk.startLine === lineNumber);
            const isChunkStart = chunkIndex !== -1;

            // Get the enrichment that owns this line
            const lineEnrichmentType = (ephLine as any).enrichmentType;
            const lineEnrichment = diffEnrichments.find(e => e.type === lineEnrichmentType);
            const lineEnrichmentData = lineEnrichment?.data;

            return (
              <LineRenderer
                key={`${lineNumber}-${index}`}
                lineNumber={lineNumber}
                lineContent={ephLine.content}
                changeType={changeType}
                hasComments={hasComments}
                lineComments={lineCommentsForLine}
                displayOldLine={displayOldLine}
                displayNewLine={displayNewLine}
                enrichmentType={lineEnrichmentType}
                prNumber={
                  lineEnrichmentType === 'pr-diff'
                    ? lineEnrichmentData?.prNumber || lineEnrichmentData?.pr?.number
                    : undefined
                }
                prTitle={
                  lineEnrichmentType === 'pr-diff'
                    ? lineEnrichmentData?.prTitle || lineEnrichmentData?.pr?.title
                    : 'Your Changes'
                }
                isFirstLineOfBlock={isFirstLineOfBlock}
                isChunkStart={isChunkStart}
                chunkIndex={chunkIndex}
                totalChunks={changeChunks.length}
                onChunkNavigate={navigateToChunk}
                onClick={() => onLineClick(lineNumber)}
                isEditable={isEditable}
                onLineEdit={onLineEdit}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
