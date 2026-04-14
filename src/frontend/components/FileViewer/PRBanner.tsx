import React from 'react';
import { GitPullRequest } from 'lucide-react';

interface PRBannerProps {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prState: string;
  prUrl?: string;
}

export function PRBanner({ prNumber, prTitle, prAuthor, prState, prUrl }: PRBannerProps) {
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

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 mb-2 rounded border"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <GitPullRequest size={14} style={{ color: 'var(--text-secondary)' }} />
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-sm hover:underline"
        style={{ color: '#0066cc' }}
      >
        PR #{prNumber}
      </a>
      <span
        className="flex-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ color: 'var(--text-primary)' }}
      >
        {prTitle}
      </span>
      {prAuthor && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          by {prAuthor}
        </span>
      )}
      <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase" style={stateBadgeStyle}>
        {prState}
      </span>
    </div>
  );
}
