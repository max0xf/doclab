/**
 * Converters for existing enrichment data to unified format
 */

import { FileComment } from '../../../../../services/commentsApi';
import { PRDiffData } from '../types/prDiff';
import { CommentEnrichment, DiffEnrichment, Enrichment } from './types';

/**
 * Convert FileComment to CommentEnrichment
 */
export function fileCommentToEnrichment(comment: FileComment): CommentEnrichment {
  const lineNum = comment.computed_line_number || 1;

  return {
    id: `comment-${comment.id}`,
    type: 'comment',
    rawMapping: {
      startLine: lineNum,
      endLine: lineNum,
      startColumn: undefined,
      endColumn: undefined,
    },
    renderedMapping: {
      blockIds: [], // Will be filled by EnrichmentMapper
    },
    visual: {
      markerType: 'inline',
      color: 'orange',
      icon: 'message-square',
      label: undefined,
      tooltip: comment.status === 'resolved' ? 'Resolved' : 'Open',
      priority: 5,
    },
    data: {
      text: comment.comment_text,
      resolved: comment.status === 'resolved',
      replyCount: 0, // TODO: Add reply support when backend supports it
      replies: undefined,
    },
    createdAt: comment.created_at,
    createdBy: comment.user.email,
    updatedAt: comment.updated_at,
  };
}

/**
 * Convert PR diff data to DiffEnrichments
 */
export function prDiffToEnrichments(prDiff: PRDiffData): DiffEnrichment[] {
  console.log('prDiffToEnrichments - input prDiff:', prDiff);
  console.log('prDiffToEnrichments - prDiff.hunks:', prDiff.hunks);

  const enrichments: DiffEnrichment[] = [];

  if (!prDiff.hunks) {
    console.log('prDiffToEnrichments - NO HUNKS, returning empty');
    return enrichments;
  }

  prDiff.hunks.forEach((hunk: any, hunkIndex) => {
    console.log(`prDiffToEnrichments - processing hunk ${hunkIndex}:`, hunk);

    // Handle both formats: hunk.changes (typed) or hunk.lines (actual API format)
    const lines = hunk.lines || [];
    console.log(`prDiffToEnrichments - hunk.lines:`, lines);

    if (!lines || lines.length === 0) {
      console.log(`prDiffToEnrichments - hunk ${hunkIndex} has no lines`);
      return;
    }

    // Parse unified diff format lines
    let newLineNumber = hunk.new_start || hunk.newStart || 0;

    lines.forEach((lineObj: any, lineIndex: number) => {
      // Handle both string format and object format
      const lineStr = typeof lineObj === 'string' ? lineObj : lineObj.content || lineObj.line || '';
      const lineType = typeof lineObj === 'object' ? lineObj.type : undefined;

      console.log(`prDiffToEnrichments - line ${lineIndex}:`, lineObj);

      // If line has explicit type property
      if (lineType) {
        if (lineType === 'context') {
          newLineNumber++;
          return;
        }
        if (lineType === 'delete') {
          return;
        }
        if (lineType === 'add') {
          const enrichment: DiffEnrichment = {
            id: `diff-${prDiff.prNumber}-${newLineNumber}`,
            type: 'diff' as const,
            rawMapping: {
              startLine: newLineNumber,
              endLine: newLineNumber,
            },
            renderedMapping: {
              blockIds: [],
            },
            visual: {
              markerType: 'highlight',
              color: 'green',
              icon: 'git-pull-request',
              label: undefined,
              tooltip: `Added in PR #${prDiff.prNumber}`,
              priority: 8,
            },
            data: {
              changeType: 'added',
              prNumber: prDiff.prNumber,
              prTitle: prDiff.prTitle,
              prAuthor: prDiff.prAuthor,
              oldContent: undefined,
              newContent: lineStr,
            },
            createdAt: new Date().toISOString(),
            createdBy: prDiff.prAuthor || 'unknown',
          };

          console.log(
            `prDiffToEnrichments - created enrichment for line ${newLineNumber}:`,
            enrichment
          );
          enrichments.push(enrichment);
          newLineNumber++;
        }
      } else {
        // Fallback: parse string format (unified diff)
        const firstChar = lineStr.charAt(0);
        const content = lineStr.substring(1);

        if (firstChar === ' ') {
          newLineNumber++;
          return;
        }

        if (firstChar === '-') {
          return;
        }

        if (firstChar === '+') {
          const enrichment: DiffEnrichment = {
            id: `diff-${prDiff.prNumber}-${newLineNumber}`,
            type: 'diff' as const,
            rawMapping: {
              startLine: newLineNumber,
              endLine: newLineNumber,
            },
            renderedMapping: {
              blockIds: [],
            },
            visual: {
              markerType: 'highlight',
              color: 'green',
              icon: 'git-pull-request',
              label: undefined,
              tooltip: `Added in PR #${prDiff.prNumber}`,
              priority: 8,
            },
            data: {
              changeType: 'added',
              prNumber: prDiff.prNumber,
              prTitle: prDiff.prTitle,
              prAuthor: prDiff.prAuthor,
              oldContent: undefined,
              newContent: content,
            },
            createdAt: new Date().toISOString(),
            createdBy: prDiff.prAuthor || 'unknown',
          };

          console.log(
            `prDiffToEnrichments - created enrichment for line ${newLineNumber}:`,
            enrichment
          );
          enrichments.push(enrichment);
          newLineNumber++;
        }
      }
    });
  });

  console.log(`prDiffToEnrichments - returning ${enrichments.length} enrichments:`, enrichments);
  return enrichments;
}

/**
 * Convert array of FileComments to enrichments
 */
export function fileCommentsToEnrichments(comments: FileComment[]): CommentEnrichment[] {
  return comments.map(fileCommentToEnrichment);
}

/**
 * Merge all enrichments from different sources
 */
export function mergeEnrichments(comments: FileComment[], prDiff: PRDiffData | null): Enrichment[] {
  const enrichments: Enrichment[] = [];

  // Add comments
  enrichments.push(...fileCommentsToEnrichments(comments));

  // Add PR diffs
  if (prDiff) {
    enrichments.push(...prDiffToEnrichments(prDiff));
  }

  return enrichments;
}
