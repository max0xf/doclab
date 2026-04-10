import React from 'react';
import { MessageSquare, GitPullRequest } from 'lucide-react';
import { FileComment } from '../../../../services/commentsApi';
import { ChangeChunkNavigator } from './ChangeChunkNavigator';

interface LineRendererProps {
  lineNumber: number;
  lineContent: string;
  displayOldLine: number | null;
  displayNewLine: number | null;
  changeType: 'add' | 'delete' | null;
  hasComments: boolean;
  lineComments: FileComment[];
  isFirstLineOfBlock: boolean;
  prNumber?: number;
  prTitle?: string;
  isChunkStart: boolean;
  chunkIndex: number;
  totalChunks: number;
  onChunkNavigate: (direction: 'prev' | 'next') => void;
  onClick: () => void;
  isEditable?: boolean;
  onLineEdit?: (lineIndex: number, newContent: string) => void;
  enrichmentType?: string;
}

export function LineRenderer({
  lineNumber,
  lineContent,
  displayOldLine,
  displayNewLine,
  changeType,
  hasComments,
  lineComments,
  isFirstLineOfBlock,
  prNumber,
  prTitle,
  isChunkStart,
  chunkIndex,
  totalChunks,
  onChunkNavigate,
  onClick,
  isEditable = false,
  onLineEdit,
  enrichmentType,
}: LineRendererProps) {
  let bgColor = 'transparent';
  let borderColor = 'transparent';

  // Check if this is a user change (not a PR diff)
  const isUserChange = changeType && prNumber === undefined;

  if (hasComments) {
    bgColor = '#fff4e5';
    borderColor = '#ff9800';
  } else if (changeType === 'add') {
    bgColor = '#e6ffed'; // Green
    borderColor = '#28a745';
  } else if (changeType === 'delete') {
    bgColor = '#ffeef0'; // Red
    borderColor = '#d73a49';
  }

  return (
    <div
      key={lineNumber}
      data-line-number={lineNumber}
      className="flex transition-colors hover:bg-opacity-50"
      style={{
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Line Numbers */}
      <div
        className="select-none flex border-r cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          fontSize: '12px',
        }}
        onClick={onClick}
      >
        <div
          className="px-2 py-1 text-right border-r"
          style={{
            minWidth: '40px',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          {displayOldLine !== null ? displayOldLine : '-'}
        </div>
        <div
          className="px-2 py-1 text-right"
          style={{
            minWidth: '40px',
            color:
              changeType === 'add'
                ? '#28a745'
                : changeType === 'delete'
                  ? '#d73a49'
                  : 'var(--text-secondary)',
          }}
        >
          {displayNewLine !== null ? displayNewLine : '-'}
        </div>
      </div>

      {/* Line Content */}
      <div
        className="flex-1 flex items-center"
        onClick={!isEditable ? onClick : undefined}
        style={{
          minWidth: 0,
          cursor: !isEditable ? 'pointer' : 'default',
        }}
      >
        <pre
          className="px-4 py-1 m-0 flex-1"
          style={{
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          <code
            contentEditable={isEditable && changeType !== 'delete'}
            suppressContentEditableWarning
            onBlur={e => {
              if (isEditable && onLineEdit) {
                onLineEdit(lineNumber - 1, e.currentTarget.textContent || '');
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            style={{
              outline: 'none',
              cursor: isEditable && changeType !== 'delete' ? 'text' : 'default',
            }}
          >
            {lineContent || ' '}
          </code>
        </pre>

        {/* Indicators */}
        <div className="flex items-center gap-2 px-2">
          {/* Enrichment badge - only show on chunk start */}
          {isChunkStart &&
            enrichmentType &&
            (enrichmentType === 'user-changes' ? (
              <span
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded"
                style={{
                  backgroundColor: '#d4e7ff',
                  color: '#0366d6',
                }}
              >
                Your Changes
              </span>
            ) : enrichmentType === 'pr-diff' && prNumber ? (
              <a
                href={`/repositories/${window.location.pathname.split('/')[2]}/pulls/${prNumber}`}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
                title={prTitle || `Pull Request #${prNumber}`}
              >
                PR #{prNumber}
              </a>
            ) : null)}
          {hasComments && (
            <>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: isEditable ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
                }}
                title={`${lineComments.length} comment${lineComments.length > 1 ? 's' : ''} (read-only)`}
              >
                <MessageSquare size={12} />
                {lineComments.length}
              </span>
              {lineComments.some(c => c.anchoring_status === 'moved') && (
                <span
                  className="inline-flex items-center px-1 py-0.5 text-xs"
                  style={{ color: '#1976d2' }}
                  title={`Line moved from ${lineComments.find(c => c.anchoring_status === 'moved')?.original_line_number}`}
                >
                  ↕
                </span>
              )}
              {lineComments.some(c => c.anchoring_status === 'outdated') && (
                <span
                  className="inline-flex items-center px-1 py-0.5 text-xs"
                  style={{ color: '#ff9800' }}
                  title="Code changed, comment may be outdated"
                >
                  ⚠
                </span>
              )}
              {lineComments.some(c => c.anchoring_status === 'deleted') && (
                <span
                  className="inline-flex items-center px-1 py-0.5 text-xs"
                  style={{ color: '#d73a49' }}
                  title="Code deleted"
                >
                  ✗
                </span>
              )}
            </>
          )}
          {changeType && prNumber && !isUserChange && isFirstLineOfBlock && (
            <a
              href={`https://git.acronis.work/projects/REAL/repos/cyber-repo/pull-requests/${prNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: changeType === 'add' ? '#28a745' : '#d73a49',
                color: 'white',
                textDecoration: 'none',
                border: isEditable ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
              }}
              title={`PR #${prNumber}: ${prTitle} - Click to open PR (read-only)`}
            >
              <GitPullRequest size={12} />#{prNumber}
            </a>
          )}
          {isChunkStart && totalChunks > 0 && (
            <ChangeChunkNavigator
              chunkIndex={chunkIndex}
              totalChunks={totalChunks}
              onNavigate={onChunkNavigate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
