import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface ChangeChunkNavigatorProps {
  chunkIndex: number;
  totalChunks: number;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export function ChangeChunkNavigator({
  chunkIndex,
  totalChunks,
  onNavigate,
}: ChangeChunkNavigatorProps) {
  if (totalChunks === 0) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
      style={{
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        border: '1px solid #1976d2',
      }}
    >
      <button
        onClick={e => {
          e.stopPropagation();
          onNavigate('prev');
        }}
        disabled={chunkIndex === 0}
        className="p-0.5 rounded hover:bg-opacity-20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: '#1976d2' }}
        title="Previous change"
      >
        <ChevronUp size={14} />
      </button>
      <span style={{ color: '#1976d2', fontWeight: 500 }}>
        {chunkIndex + 1}/{totalChunks}
      </span>
      <button
        onClick={e => {
          e.stopPropagation();
          onNavigate('next');
        }}
        disabled={chunkIndex === totalChunks - 1}
        className="p-0.5 rounded hover:bg-opacity-20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: '#1976d2' }}
        title="Next change"
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
