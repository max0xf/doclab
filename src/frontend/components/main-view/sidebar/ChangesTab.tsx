/**
 * Changes Tab Component
 *
 * Shows pending edit changes from enrichments.
 * Allows users to review, commit, and discard changes.
 */
import React, { useState, useCallback } from 'react';
import {
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Edit3,
  Check,
  Square,
  GitCommit,
  GitPullRequest,
  ExternalLink,
} from 'lucide-react';
import type { EditEnrichment, CommitEnrichment } from '../../../services/enrichmentApi';
import type { DraftChange as _DraftChange } from '../../../services/draftChangeApi';
import { discardDraftChange, commitDraftChanges } from '../../../services/draftChangeApi';
import { createPullRequest, unstageBranch } from '../../../services/userBranchApi';
import { ConfirmDialog } from '../../common/ConfirmDialog';

interface ChangesTabProps {
  currentFilePath?: string;
  spaceId?: string;
  onNavigateToFile?: (filePath: string) => void;
  editEnrichments?: EditEnrichment[];
  commitEnrichments?: CommitEnrichment[];
  onRefresh?: () => void;
  onLog?: (msg: string, level?: 'info' | 'success' | 'error') => void;
}

export function ChangesTab({
  currentFilePath,
  spaceId,
  onNavigateToFile,
  editEnrichments = [],
  commitEnrichments = [],
  onRefresh,
  onLog,
}: ChangesTabProps): JSX.Element {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [confirm, setConfirm] = useState<{
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const log = useCallback(
    (msg: string, level: 'info' | 'success' | 'error' = 'info') => onLog?.(msg, level),
    [onLog]
  );

  const askConfirm = (message: string, fn: () => void, danger = false) => {
    setConfirm({ message, onConfirm: fn, danger });
  };

  const toggleExpanded = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const handleDiscard = (changeId: string, filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    askConfirm(
      `Discard changes to ${filePath}?`,
      async () => {
        setIsLoading(true);
        try {
          await discardDraftChange(changeId);
          const newSelected = new Set(selectedFiles);
          newSelected.delete(changeId);
          setSelectedFiles(newSelected);
          onRefresh?.();
        } catch (error) {
          console.error('Failed to discard change:', error);
        } finally {
          setIsLoading(false);
        }
      },
      true
    );
  };

  const toggleFileSelection = (changeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId);
    } else {
      newSelected.add(changeId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    const allIds = editEnrichments.map(c => c.id);
    setSelectedFiles(new Set(allIds));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const handleDiscardSelected = () => {
    if (selectedFiles.size === 0) {
      return;
    }
    askConfirm(
      `Discard changes to ${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''}?`,
      async () => {
        setIsLoading(true);
        try {
          for (const changeId of selectedFiles) {
            await discardDraftChange(changeId);
          }
          setSelectedFiles(new Set());
          onRefresh?.();
        } catch (error) {
          console.error('Failed to discard changes:', error);
        } finally {
          setIsLoading(false);
        }
      },
      true
    );
  };

  const handleCommitSelected = async () => {
    if (selectedFiles.size === 0) {
      return;
    }

    setIsLoading(true);
    const fileCount = selectedFiles.size;
    const msg = commitMessage.trim() || `Update ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    log(`Committing ${fileCount} file${fileCount !== 1 ? 's' : ''}…`);
    log(`Commit message: "${msg}"`);

    try {
      log('Creating worktree and rebasing onto latest base…');
      const result = await commitDraftChanges(
        Array.from(selectedFiles),
        commitMessage || undefined
      );
      if (result.success) {
        log(
          `Commit created: ${result.commit_sha ? result.commit_sha.slice(0, 8) : '—'}`,
          'success'
        );
        log(`Pushed branch ${result.branch_name}`, 'success');
        log(
          `${result.files_committed} file${result.files_committed !== 1 ? 's' : ''} committed successfully`,
          'success'
        );
        setSelectedFiles(new Set());
        setCommitMessage('');
        onRefresh?.();
      } else {
        log(result.message || 'Commit failed', 'error');
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Commit failed';
      log(`Error: ${errMsg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <Plus size={14} className="text-green-600" />;
      case 'delete':
        return <Minus size={14} className="text-red-600" />;
      default:
        return <Edit3 size={14} className="text-blue-600" />;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return 'New file';
      case 'delete':
        return 'Deleted';
      default:
        return 'Modified';
    }
  };

  if (editEnrichments.length === 0 && commitEnrichments.length === 0) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No pending changes</p>
        <p className="text-xs mt-1">Edit a file and save to see changes here</p>
      </div>
    );
  }

  const allSelected = selectedFiles.size === editEnrichments.length && editEnrichments.length > 0;

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={() => {
            const fn = confirm.onConfirm;
            setConfirm(null);
            fn();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header for Edit (uncommitted) changes */}
        {editEnrichments.length > 0 && (
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Uncommitted Changes
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {editEnrichments.length} file{editEnrichments.length !== 1 ? 's' : ''} changed
                  {selectedFiles.size > 0 && ` (${selectedFiles.size} selected)`}
                </p>
              </div>
            </div>

            {/* Selection and Action Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={allSelected ? deselectAllFiles : selectAllFiles}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100"
                style={{ color: 'var(--text-secondary)' }}
              >
                {allSelected ? <Check size={12} /> : <Square size={12} />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>

              <div className="flex-1" />

              <button
                onClick={handleCommitSelected}
                disabled={isLoading || selectedFiles.size === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded disabled:opacity-50"
                style={{
                  backgroundColor: selectedFiles.size > 0 ? '#22c55e' : 'var(--bg-secondary)',
                  color: selectedFiles.size > 0 ? 'white' : 'var(--text-secondary)',
                }}
                title="Commit selected changes to git"
              >
                <GitCommit size={12} />
                Commit
              </button>

              <button
                onClick={handleDiscardSelected}
                disabled={isLoading || selectedFiles.size === 0}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded disabled:opacity-50"
                style={{
                  backgroundColor: selectedFiles.size > 0 ? '#ef4444' : 'var(--bg-secondary)',
                  color: selectedFiles.size > 0 ? 'white' : 'var(--text-secondary)',
                }}
                title="Discard selected changes"
              >
                <Trash2 size={12} />
                Discard
              </button>
            </div>

            {/* Commit Message Input (shown when files selected) */}
            {selectedFiles.size > 0 && (
              <div className="mt-2">
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Commit message (optional)"
                  className="w-full px-2 py-1 text-xs rounded border"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit Changes List */}
        <div className="flex-1 overflow-y-auto">
          {editEnrichments.map(change => {
            const isExpanded = expandedFiles.has(change.file_path);
            const isCurrentFile = change.file_path === currentFilePath;
            const isSelected = selectedFiles.has(change.id);

            return (
              <div
                key={change.id}
                className="border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {/* File Header */}
                <div
                  className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-opacity-50"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--accent-bg, #e0f2fe)'
                      : isCurrentFile
                        ? 'var(--bg-secondary)'
                        : 'transparent',
                  }}
                  onClick={() => toggleExpanded(change.file_path)}
                >
                  {/* Selection Checkbox */}
                  <button
                    className="p-0.5 rounded hover:bg-gray-200"
                    onClick={e => toggleFileSelection(change.id, e)}
                    title={isSelected ? 'Deselect' : 'Select'}
                  >
                    {isSelected ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Square size={14} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>

                  <button className="p-0.5">
                    {isExpanded ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    ) : (
                      <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </button>

                  {getChangeTypeIcon(change.change_type)}

                  <span
                    className="flex-1 text-sm truncate cursor-pointer hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={e => {
                      e.stopPropagation();
                      onNavigateToFile?.(change.file_path);
                    }}
                  >
                    {change.file_path}
                  </span>

                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        change.change_type === 'create'
                          ? 'var(--success-bg, #dcfce7)'
                          : change.change_type === 'delete'
                            ? 'var(--error-bg, #fef2f2)'
                            : 'var(--info-bg, #dbeafe)',
                      color:
                        change.change_type === 'create'
                          ? 'var(--success-color, #16a34a)'
                          : change.change_type === 'delete'
                            ? 'var(--error-color, #dc2626)'
                            : 'var(--info-color, #2563eb)',
                    }}
                  >
                    {getChangeTypeLabel(change.change_type)}
                  </span>

                  <button
                    onClick={e => handleDiscard(change.id, change.file_path, e)}
                    className="p-1 rounded hover:bg-red-100"
                    title="Discard this change"
                  >
                    <Trash2 size={14} style={{ color: 'var(--error-color, #dc2626)' }} />
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="text-xs" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    {/* Metadata */}
                    <div
                      className="px-4 py-2 border-b"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      {change.description && (
                        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {change.description}
                        </p>
                      )}

                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Last updated: {new Date(change.updated_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Diff Hunks */}
                    {change.diff_hunks && change.diff_hunks.length > 0 && (
                      <div className="font-mono">
                        {change.diff_hunks.map((hunk, hunkIndex) => (
                          <div key={hunkIndex}>
                            <div
                              className="px-2 py-1 text-xs"
                              style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                            >
                              @@ -{hunk.old_start},{hunk.old_count} +{hunk.new_start},
                              {hunk.new_count} @@
                            </div>
                            <div className="text-xs">
                              {hunk.lines.map((line, lineIndex) => {
                                const isAddition = line.startsWith('+');
                                const isDeletion = line.startsWith('-');
                                const lineStyle = isAddition
                                  ? { backgroundColor: '#dcfce7', color: '#166534' }
                                  : isDeletion
                                    ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                                    : {
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-primary)',
                                      };

                                return (
                                  <div
                                    key={lineIndex}
                                    className="px-2 py-0.5 whitespace-pre-wrap break-all"
                                    style={lineStyle}
                                  >
                                    {line}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Committed Changes Section — grouped by workspace */}
          {commitEnrichments.length > 0 &&
            (() => {
              // Group by branch ID (workspace)
              const groups = new Map<string, CommitEnrichment[]>();
              for (const c of commitEnrichments) {
                const existing = groups.get(c.id);
                if (existing) {
                  existing.push(c);
                } else {
                  groups.set(c.id, [c]);
                }
              }

              return (
                <>
                  <div
                    className="px-4 py-3 border-b"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <GitCommit size={16} className="text-purple-600" />
                      <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        Committed Changes
                      </h3>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}
                      >
                        {commitEnrichments.length} file{commitEnrichments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {Array.from(groups.entries()).map(([branchId, files]) => {
                    const rep = files[0];
                    const workspaceName = rep.task_name || rep.branch_name;

                    return (
                      <div key={branchId}>
                        {/* Workspace sub-header */}
                        <div
                          className="flex items-center gap-2 px-4 py-2 border-b"
                          style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                          }}
                        >
                          <GitCommit size={13} className="text-purple-500 flex-shrink-0" />
                          <span
                            className="text-xs font-medium flex-1 truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {workspaceName}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {files.length} file{files.length !== 1 ? 's' : ''}
                          </span>
                          {spaceId && rep.pr_url && (
                            <a
                              href={rep.pr_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
                            >
                              <ExternalLink size={11} />
                              PR
                            </a>
                          )}
                          {spaceId && !rep.pr_url && (
                            <button
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded disabled:opacity-50"
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                              }}
                              title="Move commits back to draft edits"
                              onClick={() =>
                                askConfirm(
                                  `Move commits from "${workspaceName}" back to draft edits?`,
                                  async () => {
                                    setIsLoading(true);
                                    try {
                                      await unstageBranch(spaceId, branchId);
                                      onRefresh?.();
                                    } catch (err) {
                                      console.error('Failed to unstage:', err);
                                    } finally {
                                      setIsLoading(false);
                                    }
                                  }
                                )
                              }
                            >
                              <GitCommit size={11} />
                              Unstage
                            </button>
                          )}
                        </div>

                        {/* Files in this workspace */}
                        {files.map(commit => {
                          const fileKey = `commit-${branchId}-${commit.file_path}`;
                          const isExpanded = expandedFiles.has(fileKey);
                          const isCurrentFile = commit.file_path === currentFilePath;

                          return (
                            <div
                              key={fileKey}
                              className="border-b"
                              style={{ borderColor: 'var(--border-color)' }}
                            >
                              <div
                                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-opacity-50"
                                style={{
                                  backgroundColor: isCurrentFile
                                    ? 'var(--bg-secondary)'
                                    : 'transparent',
                                }}
                                onClick={() => toggleExpanded(fileKey)}
                              >
                                <button className="p-0.5">
                                  {isExpanded ? (
                                    <ChevronDown
                                      size={14}
                                      style={{ color: 'var(--text-secondary)' }}
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={14}
                                      style={{ color: 'var(--text-secondary)' }}
                                    />
                                  )}
                                </button>
                                <GitCommit size={14} className="text-purple-600" />
                                <span
                                  className="flex-1 text-sm truncate cursor-pointer hover:underline"
                                  style={{ color: 'var(--text-primary)' }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    onNavigateToFile?.(commit.file_path);
                                  }}
                                >
                                  {commit.file_path}
                                </span>
                                {(commit.additions || commit.deletions) && (
                                  <span
                                    className="text-xs"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    <span className="text-green-600">+{commit.additions || 0}</span>
                                    {' / '}
                                    <span className="text-red-600">-{commit.deletions || 0}</span>
                                  </span>
                                )}
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}
                                >
                                  Committed
                                </span>
                              </div>

                              {isExpanded && (
                                <div
                                  className="text-xs"
                                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                                >
                                  <div
                                    className="px-4 py-2 space-y-1 border-b"
                                    style={{ borderColor: 'var(--border-color)' }}
                                  >
                                    {commit.commit_sha && (
                                      <div style={{ color: 'var(--text-secondary)' }}>
                                        <span className="font-medium">Commit:</span>{' '}
                                        <code className="bg-gray-100 px-1 rounded">
                                          {commit.commit_sha.slice(0, 8)}
                                        </code>
                                      </div>
                                    )}
                                    <div style={{ color: 'var(--text-secondary)' }}>
                                      Last updated: {new Date(commit.updated_at).toLocaleString()}
                                    </div>
                                    {spaceId && !rep.pr_url && (
                                      <div className="flex items-center gap-2 pt-1">
                                        <button
                                          className="flex items-center gap-1 px-2 py-1 text-xs rounded"
                                          style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
                                          disabled={isLoading}
                                          onClick={async () => {
                                            setIsLoading(true);
                                            try {
                                              const result = await createPullRequest(
                                                spaceId,
                                                branchId
                                              );
                                              onRefresh?.();
                                              if (result.pr_url) {
                                                window.open(
                                                  result.pr_url,
                                                  '_blank',
                                                  'noopener,noreferrer'
                                                );
                                              }
                                            } catch (err) {
                                              console.error('Failed to create PR:', err);
                                            } finally {
                                              setIsLoading(false);
                                            }
                                          }}
                                        >
                                          <GitPullRequest size={12} />
                                          Create PR
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {commit.diff_hunks && commit.diff_hunks.length > 0 && (
                                    <div className="font-mono">
                                      {commit.diff_hunks.map((hunk, hunkIndex) => (
                                        <div key={hunkIndex}>
                                          <div
                                            className="px-2 py-1 text-xs"
                                            style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                                          >
                                            @@ -{hunk.old_start},{hunk.old_count} +{hunk.new_start},
                                            {hunk.new_count} @@
                                          </div>
                                          <div className="text-xs">
                                            {hunk.lines.map((line, lineIndex) => {
                                              const isAddition = line.startsWith('+');
                                              const isDeletion = line.startsWith('-');
                                              return (
                                                <div
                                                  key={lineIndex}
                                                  className="px-2 py-0.5 whitespace-pre-wrap break-all"
                                                  style={
                                                    isAddition
                                                      ? {
                                                          backgroundColor: '#dcfce7',
                                                          color: '#166534',
                                                        }
                                                      : isDeletion
                                                        ? {
                                                            backgroundColor: '#fee2e2',
                                                            color: '#991b1b',
                                                          }
                                                        : {
                                                            backgroundColor: 'transparent',
                                                            color: 'var(--text-primary)',
                                                          }
                                                  }
                                                >
                                                  {line}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              );
            })()}
        </div>
      </div>
    </>
  );
}
