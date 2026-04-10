import React, { useState } from 'react';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { PlainTextRenderer } from './renderers/PlainTextRenderer';
import { EnrichedContentRenderer } from './renderers/EnrichedContentRenderer';
import { PlainTextEditor } from './editors/PlainTextEditor';
// import { VisualEditor } from './editors/VisualEditor'; // Module not found
import { FileComment } from '../../../../services/commentsApi';
import { PRDiffData } from './types/prDiff';
import { DebugInfoWidget } from './DebugInfoWidget';
import { Edit2, Trash2, Save, X } from 'lucide-react';

interface FileContentWithModesProps {
  fileName: string;
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: PRDiffData | null;
  onLineClick: (lineNumber: number) => void;
  // Debug info props
  repository?: {
    id: string;
    fullName: string;
  };
  filePath?: string;
  fileSize?: number;
}

export function FileContentWithModes({
  fileName,
  fileContent,
  fileComments,
  prDiffData,
  onLineClick,
  repository,
  filePath,
  fileSize,
}: FileContentWithModesProps) {
  const [viewMode, setViewMode] = React.useState<'view' | 'plain-text'>('plain-text');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(fileContent);
  const [userChangesData, setUserChangesData] = useState<any>(null);
  const [userChangesDiff, setUserChangesDiff] = useState<any>(null);
  const [enrichments, setEnrichments] = useState<any[]>([]);

  // Load user changes when file opens
  React.useEffect(() => {
    const loadUserChanges = async () => {
      if (!repository?.fullName || !filePath) {
        return;
      }

      try {
        const { getUserChanges } = await import('../../../../services/userChangesApi');
        const userChange = await getUserChanges(repository.fullName, filePath);

        if (userChange && userChange.status === 'added') {
          // Merge user changes with original content
          setEditedContent(userChange.modified_content);
          setUserChangesData(userChange);

          // Convert diff hunks to PRDiffData format for rendering
          if (userChange.diff_hunks && userChange.diff_hunks.length > 0) {
            const userDiff = {
              prNumber: undefined, // No PR number for user changes
              prTitle: 'Your Changes',
              prAuthor: 'You',
              hunks: userChange.diff_hunks.map((hunk: any) => ({
                old_start: hunk.old_start,
                old_lines: hunk.old_lines,
                new_start: hunk.new_start,
                new_lines: hunk.new_lines,
                lines: hunk.lines.map((line: any) => ({
                  type: line.type,
                  content: line.content,
                  old_line_number: line.old_line_number,
                  new_line_number: line.new_line_number,
                })),
              })),
            };
            setUserChangesDiff(userDiff);
          }

          console.log('Loaded user changes:', userChange);
        } else {
          // No pending changes, use original content
          setEditedContent(fileContent);
          setUserChangesData(null);
          setUserChangesDiff(null);
        }
      } catch (error) {
        console.error('Failed to load user changes:', error);
        setEditedContent(fileContent);
        setUserChangesData(null);
      }
    };

    loadUserChanges();
  }, [repository, filePath, fileContent]);

  // Build unified enrichments array
  React.useEffect(() => {
    const enrichmentsArray: any[] = [];

    // Add PR diff enrichment (priority 1)
    if (prDiffData) {
      enrichmentsArray.push({
        type: 'pr-diff',
        category: 'diff',
        data: prDiffData,
        priority: 1,
      });
    }

    // Add user changes enrichment (priority 2 - overrides PR diffs)
    if (userChangesDiff) {
      enrichmentsArray.push({
        type: 'user-changes',
        category: 'diff',
        data: userChangesDiff,
        priority: 2,
      });
    }

    setEnrichments(enrichmentsArray);
  }, [prDiffData, userChangesDiff]);

  // Sync editedContent when fileContent changes (e.g., navigating to a different file)
  React.useEffect(() => {
    if (!userChangesData) {
      setEditedContent(fileContent);
    }
  }, [fileContent, userChangesData]);

  // Check if debug mode is enabled via URL param or localStorage
  const isDebugMode = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlDebug = urlParams.get('debug') === 'true';
    const localDebug = localStorage.getItem('debugMode') === 'true';
    const result = urlDebug || localDebug;
    console.log('FileContentWithModes - Debug mode check:', {
      urlDebug,
      localDebug,
      result,
      repository,
      filePath,
    });
    return result;
  }, [repository, filePath]);

  const handleSave = async () => {
    console.log('Saving changes:', {
      repository,
      filePath,
      content: editedContent,
    });

    // Exit edit mode
    setIsEditing(false);

    // Save the changes to backend first!
    if (repository?.fullName && filePath) {
      try {
        const { saveUserChanges, getUserChanges } = await import(
          '../../../../services/userChangesApi'
        );

        // Save the edited content (original vs modified)
        await saveUserChanges(repository.fullName, filePath, fileContent, editedContent);
        console.log('Changes saved successfully');

        // Then reload user changes to show as enrichments
        const userChange = await getUserChanges(repository.fullName, filePath);
        console.log('Loaded user changes:', userChange);
        console.log('User change diff_hunks:', userChange?.diff_hunks);

        if (userChange && userChange.status === 'added') {
          setUserChangesData(userChange);

          // Convert to diff format
          if (
            userChange.diff_hunks &&
            Array.isArray(userChange.diff_hunks) &&
            userChange.diff_hunks.length > 0
          ) {
            const userDiff = {
              prNumber: undefined,
              prTitle: 'Your Changes',
              prAuthor: 'You',
              hunks: userChange.diff_hunks.map((hunk: any) => {
                console.log('Processing hunk from backend:', hunk);
                // Backend returns snake_case fields with 'lines' array
                return {
                  old_start: hunk.old_start,
                  old_lines: hunk.old_lines,
                  new_start: hunk.new_start,
                  new_lines: hunk.new_lines,
                  lines: Array.isArray(hunk.lines)
                    ? hunk.lines.map((line: any) => ({
                        type: line.type,
                        content: line.content,
                        old_line_number: line.old_line_number,
                        new_line_number: line.new_line_number,
                      }))
                    : [],
                };
              }),
            };
            setUserChangesDiff(userDiff);
          }
        }
      } catch (error) {
        console.error('Failed to reload user changes:', error);
      }
    }
  };

  const handleCancel = () => {
    setEditedContent(fileContent);
    setIsEditing(false);
  };

  const handleDiscard = async () => {
    if (!repository?.fullName || !filePath) {
      return;
    }

    try {
      const { discardUserChanges } = await import('../../../../services/userChangesApi');
      await discardUserChanges(repository.fullName, filePath);

      // Clear user changes state
      setUserChangesData(null);
      setUserChangesDiff(null);

      console.log('User changes discarded successfully');
    } catch (error) {
      console.error('Failed to discard user changes:', error);
    }
  };

  const renderContent = () => {
    const commonProps = {
      fileContent: isEditing ? editedContent : fileContent,
      fileComments,
      enrichments, // Unified enrichments array
      onLineClick,
    };

    // Plain Text mode
    if (viewMode === 'plain-text') {
      if (isEditing) {
        return (
          <PlainTextEditor
            content={editedContent}
            onChange={setEditedContent}
            onSave={handleSave}
            onCancel={handleCancel}
            fileComments={fileComments}
            prDiffData={prDiffData}
            onLineClick={onLineClick}
            repository={repository}
            filePath={filePath}
            originalContent={fileContent}
          />
        );
      }
      return <PlainTextRenderer {...commonProps} />;
    }

    // View mode (rendered content)
    if (viewMode === 'view') {
      // TODO: VisualEditor module not found, using EnrichedContentRenderer for now
      return <EnrichedContentRenderer filename={fileName} {...commonProps} />;
    }

    return <PlainTextRenderer {...commonProps} />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Debug Info Widget */}
      {isDebugMode && repository && filePath && (
        <DebugInfoWidget
          repository={repository}
          file={{
            name: fileName,
            path: filePath,
            size: fileSize,
          }}
          fileContent={fileContent}
          enrichments={enrichments}
          fileComments={fileComments}
          contentType={undefined}
          rendererName={viewMode}
        />
      )}

      {/* View Mode Switcher and Edit Toggle */}
      <div
        className="border-b px-6 py-3 flex items-center justify-end gap-3"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <ViewModeSwitcher currentMode={viewMode} onModeChange={setViewMode} />

        {/* Discard button - always visible when user changes exist */}
        {userChangesData && !isEditing && (
          <button
            onClick={handleDiscard}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: '#ef4444',
              border: '1px solid #ef4444',
            }}
          >
            <Trash2 size={16} />
            Discard Changes
          </button>
        )}

        {/* Edit/Save/Cancel buttons */}
        {isEditing ? (
          <>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all hover:opacity-90"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all hover:opacity-90"
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
              }}
            >
              <Save size={16} />
              Save
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
            }}
          >
            <Edit2 size={16} />
            Edit
          </button>
        )}
      </div>

      {/* Content Renderer */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>
    </div>
  );
}
