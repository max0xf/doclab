import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import type { DiffEnrichment, DiffHunk, DiffLine } from '../../../services/enrichmentApi';

interface DiffViewerProps {
  diff: DiffEnrichment;
  fileName: string;
  onAccept?: (diffId: string) => void;
  onReject?: (diffId: string) => void;
}

export default function DiffViewer({ diff, fileName, onAccept, onReject }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set([0]));

  const toggleHunk = (index: number) => {
    const newExpanded = new Set(expandedHunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedHunks(newExpanded);
  };

  const expandAll = () => {
    setExpandedHunks(new Set(diff.diff_hunks.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedHunks(new Set());
  };

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {fileName}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
              }}
            >
              {diff.status}
            </span>
          </div>
          {diff.description && (
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {diff.description}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-sm mr-4">
            <span style={{ color: '#4caf50' }}>+{diff.stats.additions}</span>
            <span style={{ color: '#f44336' }}>-{diff.stats.deletions}</span>
          </div>

          {/* View Mode Toggle */}
          <div
            className="flex rounded overflow-hidden border"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <button
              onClick={() => setViewMode('unified')}
              className="px-3 py-1 text-xs transition-colors"
              style={{
                backgroundColor: viewMode === 'unified' ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className="px-3 py-1 text-xs transition-colors border-l"
              style={{
                backgroundColor: viewMode === 'split' ? 'var(--bg-tertiary)' : 'transparent',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              Split
            </button>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            Collapse All
          </button>

          {/* Actions */}
          {onAccept && (
            <button
              onClick={() => onAccept(diff.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: '#4caf50',
                color: 'white',
              }}
            >
              <Check size={16} />
              Accept
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(diff.id)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: '#f44336',
                color: 'white',
              }}
            >
              <X size={16} />
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Diff Hunks */}
      <div>
        {diff.diff_hunks.map((hunk, index) => (
          <DiffHunkView
            key={index}
            hunk={hunk}
            index={index}
            isExpanded={expandedHunks.has(index)}
            onToggle={() => toggleHunk(index)}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}

interface DiffHunkViewProps {
  hunk: DiffHunk;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  viewMode: 'unified' | 'split';
}

function DiffHunkView({ hunk, index, isExpanded, onToggle, viewMode }: DiffHunkViewProps) {
  return (
    <div
      className="border-b"
      style={{
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Hunk Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2 hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
        }}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-mono text-xs">
          @@ -{hunk.old_start},{hunk.old_count} +{hunk.new_start},{hunk.new_count} @@
        </span>
        <span className="text-xs ml-2">
          Hunk {index + 1} ({hunk.lines.length} lines)
        </span>
      </button>

      {/* Hunk Content */}
      {isExpanded && (
        <div className="font-mono text-sm">
          {viewMode === 'unified' ? (
            <UnifiedDiffView
              lines={hunk.lines}
              oldStart={hunk.old_start}
              newStart={hunk.new_start}
            />
          ) : (
            <SplitDiffView lines={hunk.lines} oldStart={hunk.old_start} newStart={hunk.new_start} />
          )}
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  lines: DiffLine[];
  oldStart: number;
  newStart: number;
}

function UnifiedDiffView({ lines, oldStart, newStart }: DiffViewProps) {
  let oldLineNum = oldStart;
  let newLineNum = newStart;

  return (
    <div>
      {lines.map((line, index) => {
        const currentOldLine = line.type !== 'add' ? oldLineNum++ : null;
        const currentNewLine = line.type !== 'delete' ? newLineNum++ : null;

        return (
          <div
            key={index}
            className="flex"
            style={{
              backgroundColor:
                line.type === 'add'
                  ? '#e6ffed'
                  : line.type === 'delete'
                    ? '#ffebe9'
                    : 'transparent',
            }}
          >
            {/* Old line number */}
            <span
              className="px-2 text-right select-none"
              style={{
                width: '50px',
                color: 'var(--text-tertiary)',
                backgroundColor: line.type === 'delete' ? '#ffd7d5' : 'transparent',
              }}
            >
              {currentOldLine || ''}
            </span>

            {/* New line number */}
            <span
              className="px-2 text-right select-none border-r"
              style={{
                width: '50px',
                color: 'var(--text-tertiary)',
                borderColor: 'var(--border-color)',
                backgroundColor: line.type === 'add' ? '#ccffd8' : 'transparent',
              }}
            >
              {currentNewLine || ''}
            </span>

            {/* Line prefix */}
            <span
              className="px-2"
              style={{
                color:
                  line.type === 'add'
                    ? '#22863a'
                    : line.type === 'delete'
                      ? '#cb2431'
                      : 'var(--text-secondary)',
              }}
            >
              {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
            </span>

            {/* Line content */}
            <span
              className="flex-1 pr-4"
              style={{
                color:
                  line.type === 'add'
                    ? '#22863a'
                    : line.type === 'delete'
                      ? '#cb2431'
                      : 'var(--text-primary)',
              }}
            >
              {line.content}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SplitDiffView({ lines, oldStart, newStart }: DiffViewProps) {
  let oldLineNum = oldStart;
  let newLineNum = newStart;

  // Group lines into pairs for side-by-side view
  const pairs: Array<{ old: DiffLine | null; new: DiffLine | null }> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      pairs.push({ old: line, new: line });
      i++;
    } else if (line.type === 'delete') {
      // Look ahead for corresponding add
      let j = i + 1;
      while (j < lines.length && lines[j].type === 'delete') {
        j++;
      }

      if (j < lines.length && lines[j].type === 'add') {
        // Pair delete with add
        pairs.push({ old: lines[i], new: lines[j] });
        i = j + 1;
      } else {
        // Delete without corresponding add
        pairs.push({ old: lines[i], new: null });
        i++;
      }
    } else {
      // Add without corresponding delete
      pairs.push({ old: null, new: line });
      i++;
    }
  }

  return (
    <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border-color)' }}>
      {/* Old (left) side */}
      <div>
        {pairs.map((pair, index) => {
          const line = pair.old;
          const lineNum = line && line.type !== 'add' ? oldLineNum++ : null;

          return (
            <div
              key={`old-${index}`}
              className="flex"
              style={{
                backgroundColor: line?.type === 'delete' ? '#ffebe9' : 'transparent',
                minHeight: '1.5rem',
              }}
            >
              <span
                className="px-2 text-right select-none"
                style={{
                  width: '50px',
                  color: 'var(--text-tertiary)',
                }}
              >
                {lineNum || ''}
              </span>
              <span
                className="px-2"
                style={{
                  color: line?.type === 'delete' ? '#cb2431' : 'var(--text-secondary)',
                }}
              >
                {line?.type === 'delete' ? '-' : line ? ' ' : ''}
              </span>
              <span
                className="flex-1 pr-4"
                style={{
                  color: line?.type === 'delete' ? '#cb2431' : 'var(--text-primary)',
                }}
              >
                {line?.content || ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* New (right) side */}
      <div>
        {pairs.map((pair, index) => {
          const line = pair.new;
          const lineNum = line && line.type !== 'delete' ? newLineNum++ : null;

          return (
            <div
              key={`new-${index}`}
              className="flex"
              style={{
                backgroundColor: line?.type === 'add' ? '#e6ffed' : 'transparent',
                minHeight: '1.5rem',
              }}
            >
              <span
                className="px-2 text-right select-none"
                style={{
                  width: '50px',
                  color: 'var(--text-tertiary)',
                }}
              >
                {lineNum || ''}
              </span>
              <span
                className="px-2"
                style={{
                  color: line?.type === 'add' ? '#22863a' : 'var(--text-secondary)',
                }}
              >
                {line?.type === 'add' ? '+' : line ? ' ' : ''}
              </span>
              <span
                className="flex-1 pr-4"
                style={{
                  color: line?.type === 'add' ? '#22863a' : 'var(--text-primary)',
                }}
              >
                {line?.content || ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
