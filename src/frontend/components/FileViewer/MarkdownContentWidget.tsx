import React from 'react';
import { ContentWidgetProps } from './types';
import FileContentRenderer from '../FileContentRenderer';
import TiptapEditor from '../TiptapEditor';

/**
 * MarkdownContentWidget
 *
 * Visual Markdown editor/viewer using Tiptap for edit mode
 * and FileContentRenderer for view mode.
 */
export function MarkdownContentWidget({
  fileName,
  content,
  enrichments,
  isEditMode,
  onContentChange,
  onLineClick,
}: ContentWidgetProps) {
  if (isEditMode) {
    // Edit Mode: Tiptap WYSIWYG editor
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <TiptapEditor
          content={content}
          onChange={newContent => onContentChange?.(newContent)}
          placeholder={`Edit ${fileName}...`}
        />
      </div>
    );
  }

  // View Mode: Rendered Markdown
  return (
    <div className="flex-1 overflow-auto">
      <FileContentRenderer
        fileName={fileName}
        content={content}
        isLoading={false}
        onLineSelect={selection => onLineClick?.(selection.start)}
        selectedLines={null}
        enrichments={{
          comments: enrichments.filter(e => e.type === 'comment').map(e => e.data),
          diff: enrichments.filter(e => e.type === 'diff').map(e => e.data),
          pr_diff: enrichments.filter(e => e.type === 'pr_diff').map(e => e.data),
          local_changes: enrichments.filter(e => e.type === 'local_change').map(e => e.data),
        }}
        onEnrichmentClick={(_type, _id) => {
          // const enrichment = enrichments.find(e => e.id === String(id));
          // onEnrichmentClick?.(enrichment);
        }}
      />
    </div>
  );
}
