/**
 * Conflict Resolution Widget
 *
 * Displays when there are conflicting changes between uncommitted edits
 * and committed changes. Allows user to choose which version to keep.
 */
import React from 'react';
import { AlertTriangle, Check, X, GitCommit, Edit3 } from 'lucide-react';

interface ConflictResolutionWidgetProps {
  filePath: string;
  uncommittedHunks: Array<{
    old_start: number;
    old_count: number;
    new_start: number;
    new_count: number;
    lines: string[];
  }>;
  committedHunks: Array<{
    old_start: number;
    old_count: number;
    new_start: number;
    new_count: number;
    lines: string[];
  }>;
  onKeepUncommitted: () => void;
  onKeepCommitted: () => void;
  onDismiss: () => void;
}

export function ConflictResolutionWidget({
  filePath,
  uncommittedHunks,
  committedHunks,
  onKeepUncommitted,
  onKeepCommitted,
  onDismiss,
}: ConflictResolutionWidgetProps): JSX.Element {
  // Extract added lines from hunks for preview
  const getAddedLines = (hunks: typeof uncommittedHunks) => {
    const added: string[] = [];
    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.startsWith('+')) {
          added.push(line.slice(1));
        }
      });
    });
    return added;
  };

  const uncommittedAdded = getAddedLines(uncommittedHunks);
  const committedAdded = getAddedLines(committedHunks);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-4xl mx-4 rounded-lg shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}
        >
          <AlertTriangle size={20} className="text-red-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Conflict Detected</h3>
            <p className="text-sm text-red-600">
              Your uncommitted changes conflict with committed changes in{' '}
              <code className="bg-red-100 px-1 rounded">{filePath}</code>
            </p>
          </div>
          <button onClick={onDismiss} className="p-1 rounded hover:bg-red-200" title="Dismiss">
            <X size={18} className="text-red-600" />
          </button>
        </div>

        {/* Content - Side by side comparison */}
        <div className="flex divide-x" style={{ borderColor: 'var(--border-color)' }}>
          {/* Uncommitted Changes */}
          <div className="flex-1 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Edit3 size={16} className="text-blue-600" />
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Your Uncommitted Changes
              </h4>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
              >
                Draft
              </span>
            </div>
            <div
              className="rounded border overflow-auto max-h-64 font-mono text-xs"
              style={{
                backgroundColor: '#f0f9ff',
                borderColor: '#bfdbfe',
              }}
            >
              {uncommittedAdded.length > 0 ? (
                uncommittedAdded.map((line, i) => (
                  <div key={i} className="px-2 py-0.5" style={{ backgroundColor: '#dbeafe' }}>
                    + {line}
                  </div>
                ))
              ) : (
                <div className="px-2 py-2 text-gray-500 italic">No additions</div>
              )}
            </div>
          </div>

          {/* Committed Changes */}
          <div className="flex-1 p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitCommit size={16} className="text-purple-600" />
              <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Committed Changes
              </h4>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
              >
                In Git
              </span>
            </div>
            <div
              className="rounded border overflow-auto max-h-64 font-mono text-xs"
              style={{
                backgroundColor: '#faf5ff',
                borderColor: '#e9d5ff',
              }}
            >
              {committedAdded.length > 0 ? (
                committedAdded.map((line, i) => (
                  <div key={i} className="px-2 py-0.5" style={{ backgroundColor: '#f3e8ff' }}>
                    + {line}
                  </div>
                ))
              ) : (
                <div className="px-2 py-2 text-gray-500 italic">No additions</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Choose which version to keep. The other will be discarded.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onKeepCommitted}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded"
              style={{
                backgroundColor: '#f3e8ff',
                color: '#7c3aed',
                border: '1px solid #8b5cf6',
              }}
            >
              <Check size={14} />
              Keep Committed
            </button>
            <button
              onClick={onKeepUncommitted}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded"
              style={{
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                border: '1px solid #3b82f6',
              }}
            >
              <Check size={14} />
              Keep Uncommitted
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
