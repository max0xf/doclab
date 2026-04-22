import React from 'react';
import { ArrowLeft, MessageSquare, Pencil, Save, X, Filter } from 'lucide-react';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { ViewMode } from './virtual-content/types';

export enum ContentFilterType {
  ALL = 'all',
  ORIGINAL = 'original',
  MY_CHANGES = 'my_changes',
  MY_COMMITS = 'my_commits',
}

export type ContentFilter =
  | ContentFilterType
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
  selectedPR: _selectedPR,
  commitShas,
  hasUncommittedChanges,
  hasCommittedChanges,
  contentFilter = ContentFilterType.ALL,
  onBack,
  onViewModeChange,
  onToggleEdit,
  onToggleComments,
  onPRFilterChange: _onPRFilterChange,
  onContentFilterChange,
  onSave,
  onCancel,
  isDirty,
}: FileViewerHeaderProps) {
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

  const parseFilterValue = (value: string): ContentFilter => {
    if (
      value === ContentFilterType.ALL ||
      value === ContentFilterType.ORIGINAL ||
      value === ContentFilterType.MY_CHANGES ||
      value === ContentFilterType.MY_COMMITS
    ) {
      return value as ContentFilterType;
    }
    if (value.startsWith('pr-')) {
      return { type: 'pr', prNumber: Number(value.slice(3)) };
    }
    if (value.startsWith('commit-')) {
      return { type: 'commit', commitSha: value.slice(7) };
    }
    return ContentFilterType.ALL;
  };

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
      {/* Left: Back button, breadcrumb, and content filter */}
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

        {/* Content filter — belongs with the breadcrumb since it filters the main view */}
        {showContentFilter && (
          <>
            <div
              className="w-px h-4 self-center"
              style={{ backgroundColor: 'var(--border-color)' }}
            />
            <div className="flex items-center gap-1">
              <Filter size={12} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={getFilterValue()}
                onChange={e => onContentFilterChange?.(parseFilterValue(e.target.value))}
                className="px-2 py-0.5 text-xs rounded border"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <option value="all">All Changes</option>
                <option value="original">Original</option>
                {hasUncommittedChanges && <option value="my_changes">My Draft</option>}
                {hasCommittedChanges && <option value="my_commits">My Commits</option>}
                {prNumbers &&
                  prNumbers.map(prNum => (
                    <option key={prNum} value={`pr-${prNum}`}>
                      PR #{prNum}
                    </option>
                  ))}
                {commitShas &&
                  commitShas.map(sha => (
                    <option key={sha} value={`commit-${sha}`}>
                      {sha.slice(0, 7)}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Right: View mode + panel toggles */}
      <div className="flex items-center gap-1.5">
        {/* Edit toggle / Save+Cancel */}
        {isEditMode ? (
          <>
            <button
              onClick={onSave}
              disabled={!isDirty}
              title="Save changes"
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isDirty ? '#0066cc' : 'var(--bg-tertiary)',
                color: isDirty ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Save size={12} />
              Save
            </button>
            <button
              onClick={onCancel}
              title="Discard changes"
              className="flex items-center px-1.5 py-0.5 text-xs rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={onToggleEdit}
            title="Edit file"
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded transition-all hover:opacity-80"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Pencil size={12} />
            Edit
          </button>
        )}

        {/* View Mode Switcher */}
        <ViewModeSwitcher currentMode={viewMode} onModeChange={onViewModeChange} />

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
      </div>
    </div>
  );
}
