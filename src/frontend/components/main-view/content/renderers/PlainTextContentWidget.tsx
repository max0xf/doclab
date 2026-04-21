import React, { useState, useMemo } from 'react';
import { ContentWidgetProps } from '../virtual-content/types';
import { VirtualContentBuilder } from '../virtual-content/VirtualContentBuilder';
import { PlainTextContentRenderer } from './PlainTextContentRenderer';
import { LayeredVirtualContent } from '../virtual-content/types';

/**
 * PlainTextContentWidget
 *
 * Displays plain text with line numbers and enrichments.
 * Supports both view and edit modes.
 * Uses the new layered virtual content system.
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
  const [editedContent, setEditedContent] = useState(content);

  // Build layered virtual content from original content and enrichments
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

  // Handle content change in edit mode
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditedContent(newContent);
    onContentChange?.(newContent);
  };

  // Handle line click
  const handleLineClick = (lineNumber: number) => {
    if (!isEditMode) {
      onLineClick?.(lineNumber);
    }
  };

  // Handle enrichment click
  const handleEnrichmentClick = (enrichment: any) => {
    onEnrichmentClick?.(enrichment);
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

  // View Mode: Render virtual content
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
          onEnrichmentClick={handleEnrichmentClick}
        />
      </div>
    </div>
  );
}
