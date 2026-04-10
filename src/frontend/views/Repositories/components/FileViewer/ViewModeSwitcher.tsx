import React from 'react';
import { ViewMode, VIEW_MODE_OPTIONS } from './types';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-md"
      style={{
        backgroundColor: 'var(--bg-secondary, #f5f5f5)',
        border: '1px solid var(--border-color, #e0e0e0)',
      }}
    >
      {VIEW_MODE_OPTIONS.map(option => (
        <button
          key={option.id}
          onClick={() => onModeChange(option.id)}
          className="px-3 py-1.5 text-xs font-medium rounded transition-all hover:opacity-80"
          style={{
            backgroundColor: currentMode === option.id ? 'var(--primary, #1976d2)' : 'transparent',
            color: currentMode === option.id ? 'white' : 'var(--text-primary, #333)',
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
