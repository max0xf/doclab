import React from 'react';
import { MessageSquare, FileEdit, AlertCircle } from 'lucide-react';
import type { EnrichmentsResponse } from '../../services/enrichmentApi';

interface EnrichmentMarkersProps {
  enrichments: EnrichmentsResponse;
  lineNumber: number;
  onEnrichmentClick?: (enrichmentType: string, enrichmentId: string | number) => void;
}

export default function EnrichmentMarkers({
  enrichments,
  lineNumber,
  onEnrichmentClick,
}: EnrichmentMarkersProps) {
  const markers: JSX.Element[] = [];

  // Check for comments at this line
  if (enrichments.comments) {
    const lineComments = enrichments.comments.filter(
      comment => lineNumber >= comment.line_start && lineNumber <= comment.line_end
    );

    lineComments.forEach(comment => {
      const isResolved = comment.is_resolved;
      markers.push(
        <button
          key={`comment-${comment.id}`}
          onClick={() => onEnrichmentClick?.('comment', comment.id)}
          className="hover:opacity-80 transition-opacity"
          title={`${isResolved ? 'Resolved: ' : ''}${comment.text.substring(0, 50)}...`}
          style={{ padding: '2px' }}
        >
          <MessageSquare
            size={14}
            style={{
              color: isResolved ? '#4caf50' : '#ff9800',
              fill: isResolved ? '#4caf50' : 'none',
            }}
          />
        </button>
      );
    });
  }

  // Check for diffs at this line
  if (enrichments.diff && enrichments.diff.length > 0) {
    enrichments.diff.forEach(diff => {
      // Check if this line is affected by any diff hunk
      const affectedByDiff = diff.diff_hunks.some(hunk => {
        return lineNumber >= hunk.new_start && lineNumber < hunk.new_start + hunk.new_count;
      });

      if (affectedByDiff) {
        markers.push(
          <button
            key={`diff-${diff.id}`}
            onClick={() => onEnrichmentClick?.('diff', diff.id)}
            className="hover:opacity-80 transition-opacity"
            title={`Pending change: ${diff.description || 'No description'}`}
            style={{ padding: '2px' }}
          >
            <FileEdit size={14} style={{ color: '#2196f3' }} />
          </button>
        );
      }
    });
  }

  // PR diffs are shown inline with green/red backgrounds, no need for gutter markers

  // Check for local changes
  if (enrichments.local_changes && enrichments.local_changes.length > 0) {
    enrichments.local_changes.forEach(change => {
      markers.push(
        <button
          key={`local-${change.id}`}
          onClick={() => onEnrichmentClick?.('local_change', change.id)}
          className="hover:opacity-80 transition-opacity"
          title={`Local change: ${change.commit_message || 'No message'}`}
          style={{ padding: '2px' }}
        >
          <AlertCircle size={14} style={{ color: '#ff5722' }} />
        </button>
      );
    });
  }

  if (markers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1" style={{ display: 'inline-flex' }}>
      {markers}
    </div>
  );
}
