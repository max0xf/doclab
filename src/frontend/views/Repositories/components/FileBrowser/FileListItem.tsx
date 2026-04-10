import React from 'react';
import { Folder, FileText, MessageSquare, Loader } from 'lucide-react';
import { FileItem } from '../types';

interface FileListItemProps {
  file: FileItem;
  prNumbers: number[];
  commentCount: number;
  isPRMapLoading: boolean;
  onClick: () => void;
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

export function FileListItem({
  file,
  prNumbers,
  commentCount,
  isPRMapLoading,
  onClick,
}: FileListItemProps) {
  const isModified = prNumbers.length > 0;

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-2 hover:bg-opacity-50 cursor-pointer transition-colors"
      style={{
        backgroundColor: isModified ? '#e3f2fd' : 'transparent',
        borderBottom: '1px solid var(--border-color)',
      }}
      onClick={onClick}
    >
      {/* Source Column */}
      <div className="col-span-6 flex items-center gap-2">
        {file.type === 'directory' ? (
          <Folder size={16} style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
        )}
        <span
          className={file.type === 'directory' ? 'font-medium' : ''}
          style={{ color: 'var(--text-primary)' }}
        >
          {file.name}
        </span>
        {isModified && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: '#ff9800',
              color: 'white',
            }}
          >
            Modified
          </span>
        )}
      </div>

      {/* Description Column */}
      <div className="col-span-3" style={{ color: 'var(--text-secondary)' }}>
        -
      </div>

      {/* PRs Column */}
      <div className="col-span-1 text-center">
        {isPRMapLoading ? (
          <Loader size={14} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {prNumbers.map(prNum => (
              <span
                key={prNum}
                className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                }}
              >
                #{prNum}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comments Column */}
      <div className="col-span-1 text-center">
        {file.type === 'file' && commentCount > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
            style={{
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
            }}
          >
            <MessageSquare size={12} />
            {commentCount}
          </span>
        )}
      </div>

      {/* Size Column */}
      <div className="col-span-1 text-right" style={{ color: 'var(--text-secondary)' }}>
        {file.type === 'file' ? formatSize(file.size) : '-'}
      </div>
    </div>
  );
}
