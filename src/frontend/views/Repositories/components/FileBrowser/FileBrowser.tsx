import React from 'react';
import { FileListItem } from './FileListItem';
import { FileItem } from '../types';

interface FileBrowserProps {
  files: FileItem[];
  currentPath: string;
  prFileMap: Map<string, any[]>;
  fileCommentCounts: Record<string, number>;
  isPRMapLoading: boolean;
  isLoading: boolean;
  onFileClick: (file: FileItem) => void;
  onNavigateUp: () => void;
}

function getPRNumbersForPath(path: string, prFileMap: Map<string, any[]>): number[] {
  const prNumbers = new Set<number>();

  // Check if path itself is in PRs
  if (prFileMap.has(path)) {
    prFileMap.get(path)!.forEach(prInfo => prNumbers.add(prInfo.pr.number));
  }

  // Check if any files under this path are in PRs (for folders)
  for (const [filePath, prInfos] of prFileMap.entries()) {
    if (filePath.startsWith(path + '/')) {
      prInfos.forEach(prInfo => prNumbers.add(prInfo.pr.number));
    }
  }

  return Array.from(prNumbers).sort((a, b) => a - b);
}

export function FileBrowser({
  files,
  currentPath,
  prFileMap,
  fileCommentCounts,
  isPRMapLoading,
  isLoading,
  onFileClick,
  onNavigateUp,
}: FileBrowserProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
          Loading files...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Breadcrumb Navigation */}
      {currentPath && (
        <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onNavigateUp}
            className="text-sm hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            ← Back
          </button>
          <span className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {currentPath}
          </span>
        </div>
      )}

      {/* File List Header */}
      <div
        className="grid grid-cols-12 gap-4 px-4 py-2 border-b font-medium text-sm"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="col-span-6">Source</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-1 text-center">PRs</div>
        <div className="col-span-1 text-center">Comments</div>
        <div className="col-span-1 text-right">Size</div>
      </div>

      {/* File List */}
      <div>
        {files.map(file => {
          const fullPath = currentPath ? `${currentPath}/${file.name}` : file.path;
          const prNumbers = getPRNumbersForPath(fullPath, prFileMap);
          const commentCount = fileCommentCounts[fullPath] || 0;

          return (
            <FileListItem
              key={file.path}
              file={file}
              prNumbers={prNumbers}
              commentCount={commentCount}
              isPRMapLoading={isPRMapLoading}
              onClick={() => onFileClick(file)}
            />
          );
        })}
      </div>

      {files.length === 0 && (
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          No files found
        </div>
      )}
    </div>
  );
}
