import React, { useState, useEffect } from 'react';
import { ContentWidgetProps, VirtualLine } from './types';

/**
 * PlainTextContentWidget
 *
 * Displays plain text with line numbers and enrichments.
 * Supports both view and edit modes.
 * Implements VirtualContent approach - original content enriched by enrichments.
 */
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

  // Build virtual lines (original content + enrichments)
  useEffect(() => {
    const lines = content.split('\n');
    const virtual: VirtualLine[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineEnrichments = enrichments.filter(
        e => lineNumber >= e.lineStart && lineNumber <= e.lineEnd
      );

      virtual.push({
        lineNumber,
        virtualLineNumber: virtual.length + 1,
        content: line,
        enrichments: lineEnrichments,
        isEnrichmentLine: false,
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
          const hasEnrichments = vLine.enrichments.length > 0;
          const hasComments = vLine.enrichments.some(e => e.type === 'comment');
          const hasDiff = vLine.enrichments.some(e => e.type === 'diff' || e.type === 'pr_diff');

          return (
            <div
              key={vLine.virtualLineNumber}
              className="flex hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleLineClick(vLine.lineNumber)}
              style={{
                backgroundColor: hasDiff ? '#fff3cd' : hasComments ? '#e7f3ff' : undefined,
              }}
            >
              {/* Line Number */}
              <div
                className="flex-shrink-0 w-16 px-3 py-1 text-right select-none border-r"
                style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                {vLine.lineNumber}
              </div>

              {/* Enrichment Marker Gutter */}
              <div className="flex-shrink-0 w-8 px-1 py-1 flex items-center justify-center">
                {hasEnrichments && (
                  <div
                    className="w-2 h-2 rounded-full cursor-pointer"
                    style={{
                      backgroundColor: hasComments ? '#0066cc' : hasDiff ? '#ff9800' : '#4caf50',
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      if (vLine.enrichments[0]) {
                        onEnrichmentClick?.(vLine.enrichments[0]);
                      }
                    }}
                    title={`${vLine.enrichments.length} enrichment(s)`}
                  />
                )}
              </div>

              {/* Line Content */}
              <div className="flex-1 px-3 py-1 whitespace-pre-wrap break-all">
                {vLine.content || ' '}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
