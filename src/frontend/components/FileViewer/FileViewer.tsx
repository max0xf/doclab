import React, { useState, useEffect } from 'react';
import { FileViewerHeader } from './FileViewerHeader';
import { PlainTextContentWidget } from './PlainTextContentWidget';
import { MarkdownContentWidget } from './MarkdownContentWidget';
import { ViewMode, Enrichment } from './types';
import EnrichmentPanel from '../EnrichmentPanel';
import type { EnrichmentsResponse } from '../../services/enrichmentApi';

interface FileViewerProps {
  fileName: string;
  filePath: string;
  spaceName: string;
  content: string;
  enrichments: EnrichmentsResponse;
  onBack: () => void;
  onSave: (newContent: string, description: string) => Promise<void>;
  onEnrichmentsReload?: () => void;
  sourceUri: string;
}

export function FileViewer({
  fileName,
  filePath,
  spaceName,
  content,
  enrichments: enrichmentsResponse,
  onBack,
  onSave,
  onEnrichmentsReload,
  sourceUri,
}: FileViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('plain');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number } | null>(null);
  const [activeEnrichmentTab, setActiveEnrichmentTab] = useState<
    'all' | 'comments' | 'diffs' | 'prs' | 'local'
  >('all');
  const [editedContent, setEditedContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Convert EnrichmentsResponse to Enrichment[]
  const enrichments: Enrichment[] = [
    ...(enrichmentsResponse.comments || []).map(c => ({
      id: String(c.id),
      type: 'comment' as const,
      lineStart: c.line_start || 0,
      lineEnd: c.line_end || 0,
      data: c,
    })),
    ...(enrichmentsResponse.diff || []).map((d, i) => ({
      id: `diff-${i}`,
      type: 'diff' as const,
      lineStart: 0,
      lineEnd: 0,
      data: d,
    })),
    // For PR diffs, create enrichments for each hunk's line range
    ...(enrichmentsResponse.pr_diff || []).flatMap((pd, i) => {
      if (pd.diff_hunks && pd.diff_hunks.length > 0) {
        // Create one enrichment per hunk
        return pd.diff_hunks.map((hunk, j) => ({
          id: `pr_diff-${i}-hunk-${j}`,
          type: 'pr_diff' as const,
          lineStart: hunk.new_start,
          lineEnd: hunk.new_start + hunk.new_count - 1,
          data: { ...pd, current_hunk: hunk },
        }));
      } else {
        // No hunks available, mark entire file
        const totalLines = content.split('\n').length;
        return [
          {
            id: `pr_diff-${i}`,
            type: 'pr_diff' as const,
            lineStart: 1,
            lineEnd: totalLines,
            data: pd,
          },
        ];
      }
    }),
    ...(enrichmentsResponse.local_changes || []).map((lc, i) => ({
      id: `local_change-${i}`,
      type: 'local_change' as const,
      lineStart: 0,
      lineEnd: 0,
      data: lc,
    })),
  ];

  // Detect file type
  const isMarkdown =
    fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown');

  // Keep plain text as default for all files
  // Users can manually switch to visual mode if needed

  // Sync edited content when content changes
  useEffect(() => {
    setEditedContent(content);
    setIsDirty(false);
  }, [content]);

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    setIsDirty(newContent !== content);
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async () => {
    if (!saveDescription.trim()) {
      alert('Please provide a description for your changes');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedContent, saveDescription);
      setIsDirty(false);
      setIsEditMode(false);
      setShowSaveDialog(false);
      setSaveDescription('');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setEditedContent(content);
        setIsDirty(false);
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(false);
    }
  };

  const handleLineClick = (lineNumber: number) => {
    console.log('[FileViewer] Line clicked:', lineNumber);
    setSelectedLines({ start: lineNumber, end: lineNumber });
    setActiveEnrichmentTab('comments');
    setShowCommentsPanel(true);
  };

  const handleCommentsChange = () => {
    // Reload enrichments after comment changes
    if (onEnrichmentsReload) {
      onEnrichmentsReload();
    }
  };

  const handleEnrichmentClick = (enrichment: Enrichment) => {
    console.log('[FileViewer] Enrichment clicked:', enrichment);
    setShowCommentsPanel(true);
  };

  // Select appropriate content widget
  const renderContentWidget = () => {
    const widgetProps = {
      fileName,
      content: isEditMode ? editedContent : content,
      enrichments,
      isEditMode,
      onContentChange: handleContentChange,
      onLineClick: handleLineClick,
      onEnrichmentClick: handleEnrichmentClick,
    };

    // In edit mode or plain mode, use PlainTextContentWidget
    if (viewMode === 'plain' || (isEditMode && !isMarkdown)) {
      return <PlainTextContentWidget {...widgetProps} />;
    }

    // Visual mode for Markdown
    if (isMarkdown) {
      return <MarkdownContentWidget {...widgetProps} />;
    }

    // Fallback to plain text
    return <PlainTextContentWidget {...widgetProps} />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <FileViewerHeader
        fileName={fileName}
        filePath={filePath}
        spaceName={spaceName}
        viewMode={viewMode}
        isEditMode={isEditMode}
        commentsCount={enrichmentsResponse.comments?.length}
        showCommentsPanel={showCommentsPanel}
        onBack={onBack}
        onViewModeChange={setViewMode}
        onToggleEdit={() => setIsEditMode(!isEditMode)}
        onToggleComments={() => {
          if (!showCommentsPanel) {
            setActiveEnrichmentTab('comments');
          }
          setShowCommentsPanel(!showCommentsPanel);
        }}
        onSave={handleSaveClick}
        onCancel={handleCancel}
        isDirty={isDirty}
      />

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Widget */}
        <div className="flex-1 flex flex-col overflow-hidden">{renderContentWidget()}</div>

        {/* Enrichment Panel */}
        {showCommentsPanel && (
          <div
            className="h-full border-l overflow-hidden"
            style={{
              width: '500px',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <EnrichmentPanel
              enrichments={enrichmentsResponse}
              fileName={fileName}
              sourceUri={sourceUri}
              selectedLines={selectedLines}
              activeTab={activeEnrichmentTab}
              onClose={() => {
                setShowCommentsPanel(false);
                setSelectedLines(null);
              }}
              onAcceptDiff={async diffId => {
                console.log('[FileViewer] Accepting diff:', diffId);
              }}
              onRejectDiff={async diffId => {
                console.log('[FileViewer] Rejecting diff:', diffId);
              }}
              onCommentsChange={handleCommentsChange}
            />
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="rounded-lg shadow-xl max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Save Changes
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Describe your changes. This will be submitted for approval.
              </p>
              <textarea
                value={saveDescription}
                onChange={e => setSaveDescription(e.target.value)}
                placeholder="e.g., Fixed typo in documentation, Updated API endpoint, etc."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                rows={4}
                autoFocus
              />
            </div>
            <div
              className="px-6 py-4 border-t flex justify-end gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={isSaving || !saveDescription.trim()}
                className="px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#0066cc',
                  color: 'white',
                }}
              >
                {isSaving ? 'Saving...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
