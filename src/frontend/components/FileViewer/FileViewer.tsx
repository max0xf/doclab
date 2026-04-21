import React, { useState, useEffect, useMemo } from 'react';
import { FileViewerHeader, ContentFilter } from './FileViewerHeader';
import { PlainTextContentWidget } from './PlainTextContentWidget';
import { MarkdownContentWidget } from './MarkdownContentWidget';
import { ConflictResolutionWidget } from './ConflictResolutionWidget';
import { ViewMode, Enrichment } from './types';
import EnrichmentPanel from '../EnrichmentPanel';
import type { EnrichmentsResponse } from '../../services/enrichmentApi';
import { getDraftChange, discardDraftChange } from '../../services/draftChangeApi';

interface FileViewerProps {
  fileName: string;
  filePath: string;
  breadcrumbPath?: string;
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
  breadcrumbPath,
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
  const [_isSaving, setIsSaving] = useState(false);
  const [selectedPR, setSelectedPR] = useState<number | 'all'>('all');
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [showConflictWidget, setShowConflictWidget] = useState(false);

  // Check if there's a pending edit enrichment for this file
  const editEnrichment = enrichmentsResponse.edit?.find(e => e.file_path === filePath);
  const commitEnrichment = enrichmentsResponse.commit?.find(e => e.file_path === filePath);

  // Detect if there's a conflict (both edit and commit enrichments exist for this file)
  const hasConflict = !!(editEnrichment && commitEnrichment);

  // Load draft content when edit enrichment exists
  useEffect(() => {
    if (editEnrichment && !isEditMode) {
      getDraftChange(editEnrichment.id)
        .then(draft => {
          setDraftContent(draft.modified_content || null);
        })
        .catch(err => {
          console.error('Failed to load draft content:', err);
          setDraftContent(null);
        });
    } else if (!editEnrichment) {
      setDraftContent(null);
    }
  }, [editEnrichment, isEditMode]);

  // Content to display: ALWAYS use original content as the base
  // Enrichments (PR diffs, commits, edits) will be rendered inline by PlainTextContentWidget
  // This ensures consistent line number mapping
  const displayContent = content;

  console.log('[FileViewer] Content selection:', {
    hasDraftContent: !!draftContent,
    hasEditEnrichment: !!editEnrichment,
    hasCommitEnrichment: !!commitEnrichment,
    hasConflict,
    usingOriginalContent: hasConflict || !draftContent,
    originalContentLines: content.split('\n').length,
    draftContentLines: draftContent?.split('\n').length,
    displayContentLines: displayContent.split('\n').length,
  });

  // Get unique PR numbers from enrichments
  const prNumbers = enrichmentsResponse.pr_diff
    ? Array.from(new Set(enrichmentsResponse.pr_diff.map(pr => pr.pr_number))).sort((a, b) => a - b)
    : [];

  // Convert EnrichmentsResponse to Enrichment[] with filtering based on contentFilter
  const enrichments: Enrichment[] = useMemo(() => {
    console.group('[FileViewer] Building enrichments array');
    console.log('Content filter:', contentFilter);
    console.log('hasConflict:', hasConflict);
    console.log('Raw enrichments:', {
      comments: enrichmentsResponse.comments?.length || 0,
      pr_diff: enrichmentsResponse.pr_diff?.length || 0,
      edit: enrichmentsResponse.edit?.length || 0,
      commit: enrichmentsResponse.commit?.length || 0,
    });

    // If showing original content only, return empty enrichments (no highlights)
    if (contentFilter === 'original') {
      console.log('Filter is "original", returning empty enrichments');
      console.groupEnd();
      return [];
    }

    const allEnrichments: Enrichment[] = [
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
      // For PR diffs, create enrichments for specific changed lines only
      // Filter by selected PR, then sort by PR number (ascending) to process older PRs first
      ...(enrichmentsResponse.pr_diff || [])
        .filter(pd => selectedPR === 'all' || pd.pr_number === selectedPR)
        .sort((a, b) => a.pr_number - b.pr_number)
        .flatMap((pd, i) => {
          if (pd.diff_hunks && pd.diff_hunks.length > 0) {
            // For each hunk, create enrichments based on original file line numbers (old_start)
            return pd.diff_hunks.flatMap((hunk, j) => {
              // Find the range of original lines affected by this hunk
              let currentOldLine = hunk.old_start;
              const affectedLines = new Set<number>();

              console.log(`[FileViewer] Processing PR #${pd.pr_number} hunk ${j}:`, {
                old_start: hunk.old_start,
                old_count: hunk.old_count,
                new_start: hunk.new_start,
                new_count: hunk.new_count,
                lines_count: hunk.lines.length,
              });

              // Walk through hunk to find which original lines are affected
              for (const line of hunk.lines) {
                const prefix = line[0];

                if (prefix === ' ') {
                  // Context line - exists in original file
                  affectedLines.add(currentOldLine);
                  console.log(`[FileViewer]   CONTEXT at old line ${currentOldLine}`);
                  currentOldLine++;
                } else if (prefix === '-') {
                  // Deletion - exists in original file
                  affectedLines.add(currentOldLine);
                  console.log(`[FileViewer]   DELETION at old line ${currentOldLine}`);
                  currentOldLine++;
                } else if (prefix === '+') {
                  // Addition - doesn't exist in original, but mark the previous line
                  // so PlainTextContentWidget knows to insert additions after it
                  if (currentOldLine > hunk.old_start) {
                    affectedLines.add(currentOldLine - 1);
                  } else {
                    affectedLines.add(currentOldLine);
                  }
                  console.log(`[FileViewer]   ADDITION (marking old line ${currentOldLine})`);
                }
              }

              const affectedLinesArray = Array.from(affectedLines).sort((a, b) => a - b);
              console.log(`[FileViewer] Created enrichments for old lines:`, affectedLinesArray);

              // Create enrichments for each affected original line
              return affectedLinesArray.map(lineNum => ({
                id: `pr_diff-${i}-hunk-${j}-line-${lineNum}`,
                type: 'pr_diff' as const,
                lineStart: lineNum,
                lineEnd: lineNum,
                data: { ...pd, current_hunk: hunk },
              }));
            });
          } else {
            // No hunks available - don't create enrichments
            return [];
          }
        }),
      ...(enrichmentsResponse.local_changes || []).map((lc, i) => ({
        id: `local_change-${i}`,
        type: 'local_change' as const,
        lineStart: 0,
        lineEnd: 0,
        data: lc,
      })),
      // Edit changes (user's unsaved edits)
      // Mark the hunk start line for inline diff insertion
      ...(enrichmentsResponse.edit || []).flatMap((es, i) => {
        if (es.diff_hunks && es.diff_hunks.length > 0) {
          console.log(`[FileViewer] Processing edit enrichment ${i}, hunks:`, es.diff_hunks.length);
          return es.diff_hunks.map((hunk, j) => {
            console.log(
              `  Edit hunk ${j}: @@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@`
            );

            // Mark the hunk start line - this is where we'll insert the diff
            const hunkStartLine = hunk.old_start;
            console.log(`  Edit hunk ${j} start line (ORIGINAL file):`, hunkStartLine);

            return {
              id: `edit-${i}-hunk-${j}-line-${hunkStartLine}`,
              type: 'edit_session' as const,
              lineStart: hunkStartLine,
              lineEnd: hunkStartLine,
              data: { ...es, current_hunk: hunk },
            };
          });
        }
        return [
          {
            id: `edit-${i}`,
            type: 'edit_session' as const,
            lineStart: 0,
            lineEnd: 0,
            data: es,
          },
        ];
      }),
      // Commit changes (committed to fork but not in PR)
      // Mark the hunk start line for inline diff insertion
      ...(enrichmentsResponse.commit || []).flatMap((es, i) => {
        if (es.diff_hunks && es.diff_hunks.length > 0) {
          console.log(
            `[FileViewer] Processing commit enrichment ${i}, hunks:`,
            es.diff_hunks.length
          );
          return es.diff_hunks.map((hunk, j) => {
            console.log(
              `  Commit hunk ${j}: @@ -${hunk.old_start},${hunk.old_count} +${hunk.new_start},${hunk.new_count} @@`
            );

            // Mark the hunk start line - this is where we'll insert the diff
            const hunkStartLine = hunk.old_start;
            console.log(`  Commit hunk ${j} start line (ORIGINAL file):`, hunkStartLine);

            return {
              id: `commit-${i}-hunk-${j}-line-${hunkStartLine}`,
              type: 'commit' as const,
              lineStart: hunkStartLine,
              lineEnd: hunkStartLine,
              data: { ...es, current_hunk: hunk },
            };
          });
        }
        return [
          {
            id: `commit-${i}`,
            type: 'commit' as const,
            lineStart: 0,
            lineEnd: 0,
            data: es,
          },
        ];
      }),
    ];

    console.log('All enrichments built:', allEnrichments.length);
    console.log(
      'Enrichments by line:',
      allEnrichments
        .filter(e => e.lineStart > 0)
        .map(e => ({
          type: e.type,
          line: e.lineStart,
          id: e.id.slice(0, 30),
        }))
    );

    // Filter based on contentFilter
    let filtered = allEnrichments;
    if (contentFilter === 'all') {
      filtered = allEnrichments;
    } else if (contentFilter === 'my_changes') {
      // Only show edit_session (uncommitted) enrichments
      filtered = allEnrichments.filter(e => e.type === 'edit_session' || e.type === 'comment');
    } else if (contentFilter === 'my_commits') {
      // Only show commit enrichments
      filtered = allEnrichments.filter(e => e.type === 'commit' || e.type === 'comment');
    } else if (typeof contentFilter === 'object') {
      if (contentFilter.type === 'pr') {
        // Only show specific PR
        filtered = allEnrichments.filter(
          e =>
            e.type === 'comment' ||
            (e.type === 'pr_diff' && (e.data as any).pr_number === contentFilter.prNumber)
        );
      }
      if (contentFilter.type === 'commit') {
        // Only show specific commit
        filtered = allEnrichments.filter(
          e =>
            e.type === 'comment' ||
            (e.type === 'commit' && (e.data as any).commit_sha === contentFilter.commitSha)
        );
      }
    }

    console.log('Filtered enrichments:', filtered.length);
    console.groupEnd();
    return filtered;
  }, [enrichmentsResponse, selectedPR, contentFilter, hasConflict]);

  // Detect file type
  const isMarkdown =
    fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown');

  // Keep plain text as default for all files
  // Users can manually switch to visual mode if needed

  // Sync edited content when content changes (use displayContent to include pending changes)
  useEffect(() => {
    setEditedContent(displayContent);
    setIsDirty(false);
  }, [displayContent]);

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
    // Compare against original content, not displayContent
    setIsDirty(newContent !== content);
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(editedContent, '');
      setIsDirty(false);
      setIsEditMode(false);
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

  const handleToggleEdit = async () => {
    if (isEditMode) {
      // Exiting edit mode
      handleCancel();
    } else {
      // Entering edit mode - load draft content if exists
      if (editEnrichment) {
        try {
          const draft = await getDraftChange(editEnrichment.id);
          setEditedContent(draft.modified_content || content);
        } catch (error) {
          console.error('Failed to load draft:', error);
          setEditedContent(content);
        }
      } else {
        setEditedContent(content);
      }
      setIsEditMode(true);
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

  // Conflict resolution handlers
  const handleKeepUncommitted = async () => {
    // Keep uncommitted changes - this means we need to "unstage" the committed changes
    // For now, just close the widget and show uncommitted changes
    setShowConflictWidget(false);
    setContentFilter('my_changes');
    // TODO: Implement actual unstaging of committed changes
    alert('Keep uncommitted: This will unstage committed changes (not yet implemented)');
  };

  const handleKeepCommitted = async () => {
    // Keep committed changes - discard the uncommitted draft
    if (editEnrichment) {
      try {
        await discardDraftChange(editEnrichment.id);
        setShowConflictWidget(false);
        setContentFilter('my_commits');
        onEnrichmentsReload?.();
      } catch (error) {
        console.error('Failed to discard draft:', error);
        alert('Failed to discard uncommitted changes');
      }
    }
  };

  // Select appropriate content widget
  const renderContentWidget = () => {
    // In edit mode, use editedContent; otherwise use displayContent (which includes pending changes)
    const contentToShow = isEditMode ? editedContent : displayContent;

    const widgetProps = {
      fileName,
      filePath,
      content: contentToShow,
      originalContent: content, // Pass original content for diff highlighting
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
        breadcrumbPath={breadcrumbPath}
        spaceName={spaceName}
        viewMode={viewMode}
        isEditMode={isEditMode}
        commentsCount={enrichmentsResponse.comments?.length}
        showCommentsPanel={showCommentsPanel}
        prNumbers={prNumbers}
        selectedPR={selectedPR}
        commitShas={commitEnrichment?.commit_sha ? [commitEnrichment.commit_sha] : undefined}
        hasUncommittedChanges={!!editEnrichment}
        hasCommittedChanges={!!commitEnrichment}
        contentFilter={contentFilter}
        onBack={onBack}
        onViewModeChange={setViewMode}
        onToggleEdit={handleToggleEdit}
        onToggleComments={() => {
          if (!showCommentsPanel) {
            setActiveEnrichmentTab('comments');
          }
          setShowCommentsPanel(!showCommentsPanel);
        }}
        onPRFilterChange={setSelectedPR}
        onContentFilterChange={setContentFilter}
        onSave={handleSaveClick}
        onCancel={handleCancel}
        isDirty={isDirty}
      />

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Content Widget */}
        <div className="flex-1 flex flex-col">{renderContentWidget()}</div>

        {/* Enrichment Panel */}
        {showCommentsPanel && (
          <div
            className="h-full border-l flex flex-col"
            style={{
              width: '500px',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            <EnrichmentPanel
              enrichments={enrichmentsResponse}
              fileName={fileName}
              filePath={filePath}
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

      {/* Conflict Resolution Widget */}
      {showConflictWidget && hasConflict && editEnrichment && commitEnrichment && (
        <ConflictResolutionWidget
          filePath={filePath}
          uncommittedHunks={editEnrichment.diff_hunks || []}
          committedHunks={commitEnrichment.diff_hunks || []}
          onKeepUncommitted={handleKeepUncommitted}
          onKeepCommitted={handleKeepCommitted}
          onDismiss={() => setShowConflictWidget(false)}
        />
      )}

      {/* Conflict Banner - show when conflict exists but widget is not open */}
      {hasConflict && !showConflictWidget && (
        <div
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg cursor-pointer"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
          }}
          onClick={() => setShowConflictWidget(true)}
        >
          <span className="text-red-600 font-medium">⚠️ Conflict detected</span>
          <button
            className="px-2 py-1 text-xs rounded"
            style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}
