import React from 'react';
import { GitPullRequest } from 'lucide-react';
import { DiffBlockType } from '../types/prDiff';

interface PRBannerProps {
  prNumber: number;
  prTitle: string;
  prAuthor?: string;
  diffType: DiffBlockType;
}

export function PRBanner({ prNumber, prTitle, prAuthor, diffType }: PRBannerProps) {
  const getDiffBadgeStyle = () => {
    switch (diffType) {
      case 'added':
        return {
          backgroundColor: '#28a745',
          color: 'white',
        };
      case 'deleted':
        return {
          backgroundColor: '#d73a49',
          color: 'white',
        };
      case 'modified':
        return {
          backgroundColor: '#ffc107',
          color: '#000',
        };
      default:
        return {
          backgroundColor: '#6c757d',
          color: 'white',
        };
    }
  };

  const diffBadgeStyle = getDiffBadgeStyle();

  return (
    <div
      className="pr-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        marginBottom: '8px',
        backgroundColor: '#f6f8fa',
        border: '1px solid #d0d7de',
        borderRadius: '6px',
        fontSize: '12px',
      }}
    >
      <GitPullRequest size={14} style={{ color: '#6c757d' }} />
      <span style={{ fontWeight: 600, color: '#0969da' }}>PR #{prNumber}</span>
      <span
        style={{
          color: '#57606a',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {prTitle}
      </span>
      {prAuthor && <span style={{ color: '#57606a', fontSize: '11px' }}>by {prAuthor}</span>}
      <span
        className="diff-badge"
        style={{
          ...diffBadgeStyle,
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {diffType}
      </span>
    </div>
  );
}
