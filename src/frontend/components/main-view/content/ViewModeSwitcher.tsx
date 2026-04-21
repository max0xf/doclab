import React from 'react';
import { ViewMode, VIEW_MODE_OPTIONS } from './virtual-content/types';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-1 py-0.5 rounded"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      {VIEW_MODE_OPTIONS.map(option => (
        <button
          key={option.id}
          onClick={() => onModeChange(option.id)}
          className="px-2 py-0.5 text-xs font-medium rounded transition-all hover:opacity-80"
          style={{
            backgroundColor: currentMode === option.id ? '#0066cc' : 'transparent',
            color: currentMode === option.id ? 'white' : 'var(--text-primary)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          title={option.description}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
