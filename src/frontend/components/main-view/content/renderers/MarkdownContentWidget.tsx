import React, { useState } from 'react';
import { ContentWidgetProps } from '../virtual-content/types';

/**
 * MarkdownContentWidget
 *
 * Simple Markdown viewer/editor
 * TODO: Implement proper markdown rendering with enrichments
 */
export function MarkdownContentWidget({
  fileName: _fileName,
  content,
  enrichments: _enrichments,
  isEditMode,
  onContentChange,
  onLineClick: _onLineClick,
}: ContentWidgetProps) {
  const [editedContent, setEditedContent] = useState(content);

  if (isEditMode) {
    // Edit Mode: Simple textarea for now
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <textarea
          value={editedContent}
          onChange={e => {
            setEditedContent(e.target.value);
            onContentChange?.(e.target.value);
          }}
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

  // View Mode: Simple pre-formatted text for now
  // TODO: Use markdown renderer with enrichments
  return (
    <div className="flex-1 overflow-auto p-4">
      <pre className="whitespace-pre-wrap font-mono text-sm">{content}</pre>
    </div>
  );
}
