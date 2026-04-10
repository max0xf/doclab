import React from 'react';
import { MessageSquare } from 'lucide-react';
import { PRNavigator } from './PRNavigator';
import { DebugInfoWidget } from './DebugInfoWidget';

interface FileViewerHeaderProps {
  repositoryFullName: string;
  fileName: string;
  fileSize?: number;
  showComments: boolean;
  allPRDiffs: any[];
  currentPRIndex: number;
  onBack: () => void;
  onToggleComments: () => void;
  onPRChange: (index: number) => void;
  // Debug info props
  repository?: {
    id: string;
    fullName: string;
  };
  file?: {
    name: string;
    path: string;
    size?: number;
  };
  fileContent?: string;
  prDiffData?: any; // Kept for backward compatibility but not used - enrichments array is used instead
  fileComments?: any[];
  contentType?: any;
  enrichments?: any[];
  rendererName?: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewerHeader({
  repositoryFullName,
  fileName,
  fileSize,
  showComments,
  allPRDiffs,
  currentPRIndex,
  onBack,
  onToggleComments,
  onPRChange,
  repository,
  file,
  fileContent,
  prDiffData: _prDiffData,
  fileComments,
  contentType,
  enrichments,
  rendererName,
}: FileViewerHeaderProps) {
  // Check if debug mode is enabled via URL param or localStorage
  const isDebugMode = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || localStorage.getItem('debugMode') === 'true';
  }, []);

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
    >
      {isDebugMode && repository && file && fileContent && (
        <DebugInfoWidget
          repository={repository}
          file={file}
          fileContent={fileContent}
          fileComments={fileComments || []}
          contentType={contentType}
          enrichments={enrichments || []}
          rendererName={rendererName}
        />
      )}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {repositoryFullName}
          </h1>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            /
          </span>
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            {fileName}
          </span>
          <button
            onClick={onToggleComments}
            className="ml-auto p-2 rounded hover:opacity-70 transition-opacity"
            style={{ color: showComments ? 'var(--primary)' : 'var(--text-secondary)' }}
            title="Toggle comments"
          >
            <MessageSquare size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm px-3 py-1.5 rounded-md hover:shadow-sm transition-all"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              ← Back to files
            </button>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {formatSize(fileSize)}
            </span>
          </div>

          <PRNavigator
            allPRDiffs={allPRDiffs}
            currentPRIndex={currentPRIndex}
            onPRChange={onPRChange}
          />
        </div>
      </div>
    </div>
  );
}
