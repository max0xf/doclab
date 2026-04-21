import React, { useState } from 'react';
import { Enrichment, EnrichmentType } from '../virtual-content/types';

interface ConflictDetailsDialogProps {
  conflicts: Enrichment[];
  initialIndex?: number;
  onClose: () => void;
}

function enrichmentLabel(e: Enrichment | null | undefined): string {
  if (!e) {
    return '?';
  }
  const d = e.data as any;
  if (e.type === EnrichmentType.PR) {
    return `PR #${d?.pr_number}`;
  }
  if (e.type === EnrichmentType.COMMIT) {
    return `Commit ${String(d?.commit_sha).slice(0, 7)}`;
  }
  if (e.type === EnrichmentType.EDIT) {
    return 'Your pending edit';
  }
  return String(e.type);
}

function HunkDiff({ hunk }: { hunk: any }) {
  if (!hunk?.lines?.length) {
    return null;
  }
  return (
    <pre
      className="text-xs rounded overflow-x-auto p-2 m-0 leading-5"
      style={{ backgroundColor: '#f8f8f8', fontFamily: 'monospace' }}
    >
      {(hunk.lines as string[]).map((line, i) => {
        const prefix = line[0];
        const content = line.slice(1);
        let color = '#444';
        if (prefix === '+') {
          color = '#1a7f37';
        } else if (prefix === '-') {
          color = '#cf222e';
        }
        return (
          <div key={i} style={{ color }}>
            {prefix}
            {content}
          </div>
        );
      })}
    </pre>
  );
}

export const ConflictDetailsDialog: React.FC<ConflictDetailsDialogProps> = ({
  conflicts,
  initialIndex = 0,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const conflict = conflicts[Math.min(index, conflicts.length - 1)];
  const { firstEnrichment, secondEnrichment, hunk } = (conflict?.data as any) || {};

  const winnerLabel = enrichmentLabel(firstEnrichment);
  const loserLabel = enrichmentLabel(secondEnrichment);
  const lineRange =
    conflict.lineStart === conflict.lineEnd
      ? `line ${conflict.lineStart}`
      : `lines ${conflict.lineStart}–${conflict.lineEnd}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-gray-200"
          style={{ backgroundColor: '#fef2f2' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: '#dc2626' }}>
              ⚠️ Conflict
            </span>
            {conflicts.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  disabled={index === 0}
                  onClick={() => setIndex(i => i - 1)}
                  aria-label="Previous conflict"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-500">
                  {index + 1} of {conflicts.length}
                </span>
                <button
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                  disabled={index === conflicts.length - 1}
                  onClick={() => setIndex(i => i + 1)}
                  aria-label="Next conflict"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 text-base leading-none px-1"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-gray-500">
            {winnerLabel} and {loserLabel} both modify {lineRange}.
          </p>

          {/* Applied (winner) */}
          <div className="rounded-md border border-green-200 overflow-hidden">
            <div
              className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-b border-green-200"
              style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}
            >
              <span>✓ Applied</span>
              <span className="font-normal text-green-700">— {winnerLabel}</span>
            </div>
            <div className="px-3 py-2 text-xs text-gray-500">
              This change is visible in the document view.
            </div>
          </div>

          {/* Blocked (loser) */}
          <div className="rounded-md border border-red-200 overflow-hidden">
            <div
              className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-b border-red-200"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
            >
              <span>✗ Blocked</span>
              <span className="font-normal text-red-600">— {loserLabel}</span>
            </div>
            <div className="p-2">
              {hunk ? (
                <HunkDiff hunk={hunk} />
              ) : (
                <p className="text-xs text-gray-400 px-1">No hunk data available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
