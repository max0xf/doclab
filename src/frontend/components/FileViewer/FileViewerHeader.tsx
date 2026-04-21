import React from 'react';
import { ArrowLeft, MessageSquare, Edit, Save, X, GitPullRequest, Filter } from 'lucide-react';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { ViewMode } from './types';

export type ContentFilter =
  | 'all'
  | 'original'
  | 'my_changes'
  | 'my_commits'
  | { type: 'pr'; prNumber: number }
  | { type: 'commit'; commitSha: string };

interface FileViewerHeaderProps {
  fileName: string;
  filePath: string;
  breadcrumbPath?: string;
  spaceName: string;
  viewMode: ViewMode;
  isEditMode: boolean;
  commentsCount?: number;
  showCommentsPanel: boolean;
  prNumbers?: number[];
  selectedPR?: number | 'all';
  commitShas?: string[];
  hasUncommittedChanges?: boolean;
  hasCommittedChanges?: boolean;
  contentFilter?: ContentFilter;
  onBack: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleEdit: () => void;
  onToggleComments: () => void;
  onPRFilterChange?: (prNumber: number | 'all') => void;
  onContentFilterChange?: (filter: ContentFilter) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isDirty?: boolean;
}

export function FileViewerHeader({
  fileName: _fileName,
  filePath,
  breadcrumbPath,
  spaceName,
  viewMode,
  isEditMode,
  commentsCount,
  showCommentsPanel,
  prNumbers,
  selectedPR = 'all',
  commitShas,
  hasUncommittedChanges,
  hasCommittedChanges,
  contentFilter = 'all',
  onBack,
  onViewModeChange,
  onToggleEdit,
  onToggleComments,
  onPRFilterChange,
  onContentFilterChange,
  onSave,
  onCancel,
  isDirty,
}: FileViewerHeaderProps) {
  // Helper to get current filter display value
  const getFilterValue = (): string => {
    if (typeof contentFilter === 'string') {
      return contentFilter;
    }
    if (contentFilter.type === 'pr') {
      return `pr-${contentFilter.prNumber}`;
    }
    if (contentFilter.type === 'commit') {
      return `commit-${contentFilter.commitSha}`;
    }
    return 'all';
  };

  // Helper to parse filter value from select
  const parseFilterValue = (value: string): ContentFilter => {
    if (
      value === 'all' ||
      value === 'original' ||
      value === 'my_changes' ||
      value === 'my_commits'
    ) {
      return value;
    }
    if (value.startsWith('pr-')) {
      return { type: 'pr', prNumber: Number(value.slice(3)) };
    }
    if (value.startsWith('commit-')) {
      return { type: 'commit', commitSha: value.slice(7) };
    }
    return 'all';
  };

  // Check if we should show the filter dropdown
  const showContentFilter =
    !isEditMode &&
    onContentFilterChange &&
    ((prNumbers && prNumbers.length > 0) || hasUncommittedChanges || hasCommittedChanges);
  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left: Back button and file info */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--primary)',
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {spaceName} / {breadcrumbPath || filePath}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        {/* View Mode Switcher */}
        {!isEditMode && <ViewModeSwitcher currentMode={viewMode} onModeChange={onViewModeChange} />}

        {/* Content Filter Dropdown */}
        {showContentFilter && (
          <div className="flex items-center gap-1">
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={getFilterValue()}
              onChange={e => onContentFilterChange?.(parseFilterValue(e.target.value))}
              className="px-2 py-1 text-xs rounded border"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <option value="all">All Changes</option>
              <option value="original">Original Content</option>
              {hasUncommittedChanges && (
                <option value="my_changes">✏️ My Uncommitted Changes</option>
              )}
              {hasCommittedChanges && <option value="my_commits">📦 My Commits</option>}
              {prNumbers &&
                prNumbers.map(prNum => (
                  <option key={prNum} value={`pr-${prNum}`}>
                    PR #{prNum}
                  </option>
                ))}
              {commitShas &&
                commitShas.map(sha => (
                  <option key={sha} value={`commit-${sha}`}>
                    Commit {sha.slice(0, 7)}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Legacy PR Filter Dropdown - kept for backward compatibility */}
        {!isEditMode &&
          !showContentFilter &&
          prNumbers &&
          prNumbers.length > 1 &&
          onPRFilterChange && (
            <div className="flex items-center gap-1">
              <GitPullRequest size={14} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={selectedPR}
                onChange={e =>
                  onPRFilterChange(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="px-2 py-1 text-xs rounded border"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <option value="all">All PRs ({prNumbers.length})</option>
                {prNumbers.map(prNum => (
                  <option key={prNum} value={prNum}>
                    PR #{prNum}
                  </option>
                ))}
              </select>
            </div>
          )}

        {/* Comments Button */}
        <button
          onClick={onToggleComments}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: showCommentsPanel ? '#0066cc' : 'var(--bg-tertiary)',
            color: showCommentsPanel ? 'white' : 'var(--text-secondary)',
          }}
        >
          <MessageSquare size={14} />
          Comments {commentsCount ? `(${commentsCount})` : ''}
        </button>

        {/* Edit Mode Controls */}
        {isEditMode ? (
          <>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!isDirty}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0066cc',
                color: 'white',
              }}
            >
              <Save size={14} />
              Save
            </button>
          </>
        ) : (
          <button
            onClick={onToggleEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <Edit size={14} />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
