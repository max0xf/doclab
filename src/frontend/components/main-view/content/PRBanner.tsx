import React, { useState } from 'react';
import { GitPullRequest, ChevronDown, ChevronRight } from 'lucide-react';

interface PRDiffHunk {
  old_start: number;
  old_count: number;
  new_start: number;
  new_count: number;
  lines: string[];
}

interface PRBannerProps {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prState: string;
  prUrl?: string;
  diffHunks?: PRDiffHunk[];
}

export function PRBanner({
  prNumber,
  prTitle,
  prAuthor,
  prState,
  prUrl,
  diffHunks,
}: PRBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const getStateBadgeStyle = () => {
    switch (prState.toLowerCase()) {
      case 'open':
        return {
          backgroundColor: '#28a745',
          color: 'white',
        };
      case 'merged':
        return {
          backgroundColor: '#6f42c1',
          color: 'white',
        };
      case 'closed':
        return {
          backgroundColor: '#d73a49',
          color: 'white',
        };
      default:
        return {
          backgroundColor: '#6c757d',
          color: 'white',
        };
    }
  };

  const stateBadgeStyle = getStateBadgeStyle();

  const hasDiffHunks = diffHunks && diffHunks.length > 0;

  return (
    <div
      className="mb-2 rounded border overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* PR Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-opacity-80"
        onClick={() => hasDiffHunks && setIsExpanded(!isExpanded)}
      >
        {hasDiffHunks && (
          <button
            className="p-0"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        <GitPullRequest size={14} style={{ color: 'var(--text-secondary)' }} />
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sm hover:underline"
          style={{ color: '#0066cc' }}
          onClick={e => e.stopPropagation()}
        >
          PR #{prNumber}
        </a>
        <span
          className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
        >
          {prTitle}
        </span>
        {hasDiffHunks && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {diffHunks.length} {diffHunks.length === 1 ? 'change' : 'changes'}
          </span>
        )}
        {prAuthor && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            by {prAuthor}
          </span>
        )}
        <span
          className="px-2 py-0.5 rounded text-xs font-semibold uppercase"
          style={stateBadgeStyle}
        >
          {prState}
        </span>
      </div>

      {/* Diff Hunks */}
      {isExpanded && hasDiffHunks && (
        <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
          {diffHunks.map((hunk, index) => (
            <div
              key={index}
              className="border-b last:border-b-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {/* Hunk Header */}
              <div
                className="px-3 py-1 text-xs font-mono"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                @@ -{hunk.old_start},{hunk.old_count} +{hunk.new_start},{hunk.new_count} @@
              </div>
              {/* Hunk Lines */}
              <div className="font-mono text-xs">
                {hunk.lines.map((line, lineIndex) => {
                  const isAddition = line.startsWith('+');
                  const isDeletion = line.startsWith('-');
                  const lineStyle = isAddition
                    ? { backgroundColor: '#e6ffed', color: '#24292e' }
                    : isDeletion
                      ? { backgroundColor: '#ffeef0', color: '#24292e' }
                      : { color: 'var(--text-primary)' };

                  return (
                    <div key={lineIndex} className="px-3 py-0.5" style={lineStyle}>
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
  );
}
