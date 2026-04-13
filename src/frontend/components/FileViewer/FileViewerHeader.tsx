import React from 'react';
import { ArrowLeft, MessageSquare, Edit, Save, X } from 'lucide-react';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { ViewMode } from './types';

interface FileViewerHeaderProps {
  fileName: string;
  filePath: string;
  spaceName: string;
  viewMode: ViewMode;
  isEditMode: boolean;
  commentsCount?: number;
  showCommentsPanel: boolean;
  onBack: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleEdit: () => void;
  onToggleComments: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isDirty?: boolean;
}

export function FileViewerHeader({
  fileName,
  filePath,
  spaceName,
  viewMode,
  isEditMode,
  commentsCount,
  showCommentsPanel,
  onBack,
  onViewModeChange,
  onToggleEdit,
  onToggleComments,
  onSave,
  onCancel,
  isDirty,
}: FileViewerHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left: Back button and file info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--primary)',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {fileName}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {spaceName} / {filePath}
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* View Mode Switcher */}
        {!isEditMode && <ViewModeSwitcher currentMode={viewMode} onModeChange={onViewModeChange} />}

        {/* Comments Button */}
        <button
          onClick={onToggleComments}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: showCommentsPanel ? '#0066cc' : 'var(--bg-tertiary)',
            color: showCommentsPanel ? 'white' : 'var(--text-secondary)',
          }}
        >
          <MessageSquare size={16} />
          Comments {commentsCount ? `(${commentsCount})` : ''}
        </button>

        {/* Edit Mode Controls */}
        {isEditMode ? (
          <>
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!isDirty}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0066cc',
                color: 'white',
              }}
            >
              <Save size={16} />
              Save Changes
            </button>
          </>
        ) : (
          <button
            onClick={onToggleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <Edit size={16} />
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
