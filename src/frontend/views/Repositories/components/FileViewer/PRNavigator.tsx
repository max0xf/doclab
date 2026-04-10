import React from 'react';
import { ChevronDown } from 'lucide-react';

interface PRNavigatorProps {
  allPRDiffs: any[];
  currentPRIndex: number;
  onPRChange: (index: number) => void;
}

export function PRNavigator({ allPRDiffs, currentPRIndex, onPRChange }: PRNavigatorProps) {
  if (allPRDiffs.length <= 1) {
    return null;
  }

  const handlePrevious = () => {
    const newIndex = (currentPRIndex - 1 + allPRDiffs.length) % allPRDiffs.length;
    onPRChange(newIndex);
  };

  const handleNext = () => {
    const newIndex = (currentPRIndex + 1) % allPRDiffs.length;
    onPRChange(newIndex);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        PR Changes:
      </span>
      <button
        onClick={handlePrevious}
        className="p-1 rounded hover:bg-opacity-70 transition-all"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        title="Previous PR"
      >
        <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
      </button>
      <div className="flex items-center gap-2">
        {allPRDiffs.map((diff, index) => (
          <button
            key={diff.pr.number}
            onClick={() => onPRChange(index)}
            className="px-2 py-1 rounded text-xs font-medium transition-all"
            style={{
              backgroundColor: index === currentPRIndex ? '#1976d2' : '#e3f2fd',
              color: index === currentPRIndex ? 'white' : '#1976d2',
            }}
          >
            #{diff.pr.number}
          </button>
        ))}
      </div>
      <button
        onClick={handleNext}
        className="p-1 rounded hover:bg-opacity-70 transition-all"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        title="Next PR"
      >
        <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
      </button>
    </div>
  );
}
