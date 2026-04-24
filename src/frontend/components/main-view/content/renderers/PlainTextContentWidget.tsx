import React, { useRef, useMemo, useEffect } from 'react';
import {
  ContentWidgetProps,
  DiffType,
  EnrichmentType,
  VirtualLine,
  LayeredVirtualContent,
} from '../virtual-content/types';
import { VirtualContentBuilder } from '../virtual-content/VirtualContentBuilder';
import { PlainTextContentRenderer } from './PlainTextContentRenderer';

// Compute the draft-modified content from the virtual lines plus any per-line edits.
//
// Rules:
//   INCLUDE — original lines that were not removed by an edit_session hunk
//   INCLUDE — lines added by an edit_session enrichment (the user's additions)
//   INCLUDE — lines shown as deleted by PR/commit (they are NOT removed from the
//             user's editable base; excluding them would make the backend believe
//             the user deleted those lines, creating a false conflict with the PR)
//   EXCLUDE — lines added by PR/commit enrichments (visual-only overlays)
//   EXCLUDE — lines removed by an edit_session hunk (the user did delete these)
function reconstructContent(finalLines: VirtualLine[], lineEdits: Map<number, string>): string {
  const outputLines = finalLines.filter(line => {
    // Lines the edit_session is removing — not in output.
    if (
      line.diffType === DiffType.DELETION &&
      line.sourceEnrichment?.type === EnrichmentType.EDIT
    ) {
      return false;
    }
    // Lines added by non-edit enrichments (PR, commit) — visual-only, not in output.
    if (
      line.isInsertedLine &&
      line.diffType === DiffType.ADDITION &&
      line.sourceEnrichment?.type !== EnrichmentType.EDIT
    ) {
      return false;
    }
    return true;
  });
  return outputLines.map(line => lineEdits.get(line.virtualLineNumber) ?? line.content).join('\n');
}

/**
 * PlainTextContentWidget
 *
 * Displays plain text with line numbers and enrichments in both view and edit mode.
 * In edit mode the same enriched rendering is shown, but each line that belongs to
 * the editable base content (original lines + edit-session additions) becomes
 * contentEditable so the user can type directly into the enriched view.
 */
export function PlainTextContentWidget({
  fileName: _fileName,
  filePath: _filePath,
  content,
  originalContent: _originalContent,
  enrichments,
  isEditMode,
  onContentChange,
  onLineClick,
  onEnrichmentClick,
}: ContentWidgetProps) {
  // Per-line content overrides keyed by virtualLineNumber.
  // Using a ref avoids triggering re-renders on every keystroke; the parent is
  // notified via onContentChange instead.
  const lineEditsRef = useRef<Map<number, string>>(new Map());

  const virtualContent: LayeredVirtualContent = useMemo(() => {
    console.log('[PlainTextContentWidget] Building virtual content');
    console.log('Content length:', content.length);
    console.log('Enrichments:', enrichments.length);

    const builder = new VirtualContentBuilder(content, enrichments, {
      detectConflicts: true,
      enrichmentOrder: ['pr_diff', 'commit', 'edit_session'],
    });

    const result = builder.build();

    console.log('[PlainTextContentWidget] Virtual content built:');
    console.log('  Layers:', result.stats.totalLayers);
    console.log('  Total lines:', result.stats.totalLines);
    console.log('  Inserted lines:', result.stats.insertedLines);
    console.log('  Conflicts:', result.stats.conflictCount);

    return result;
  }, [content, enrichments]);

  // Keep stable refs so the isEditMode effect can read current values without
  // needing them as dependencies (which would cause spurious re-runs).
  const virtualContentRef = useRef(virtualContent);
  virtualContentRef.current = virtualContent;
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  // Clear per-line edits whenever the virtual content is rebuilt (content or
  // enrichments changed externally, e.g. a reload).
  useEffect(() => {
    lineEditsRef.current = new Map();
  }, [content, enrichments]);

  // When edit mode is entered, immediately push the correctly reconstructed
  // content to the parent. This ensures that a save-without-typing uses the same
  // reconstruction logic (which excludes PR/commit additions and includes PR/commit
  // deletion lines), instead of the stale draft content loaded from the backend.
  useEffect(() => {
    if (isEditMode) {
      const reconstructed = reconstructContent(
        virtualContentRef.current.finalLines,
        lineEditsRef.current
      );
      onContentChangeRef.current?.(reconstructed);
    }
    // Intentionally only isEditMode in deps — we want a snapshot at the moment
    // edit mode is entered, not every time virtualContent or onContentChange changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const handleLineContentChange = (virtualLineNumber: number, newLineContent: string) => {
    lineEditsRef.current.set(virtualLineNumber, newLineContent);
    const reconstructed = reconstructContent(virtualContent.finalLines, lineEditsRef.current);
    onContentChange?.(reconstructed);
  };

  const handleLineClick = (lineNumber: number) => {
    if (!isEditMode) {
      onLineClick?.(lineNumber);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="font-mono text-sm"
        style={{
          backgroundColor: '#f8f9fa',
        }}
      >
        <PlainTextContentRenderer
          virtualContent={virtualContent}
          onLineClick={handleLineClick}
          onEnrichmentClick={onEnrichmentClick}
          isEditMode={isEditMode}
          onLineContentChange={isEditMode ? handleLineContentChange : undefined}
        />
      </div>
    </div>
  );
}
