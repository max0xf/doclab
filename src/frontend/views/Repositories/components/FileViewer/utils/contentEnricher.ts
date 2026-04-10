/**
 * Content Enrichment - Add diff and comment metadata to AST
 */

import { visit } from 'unist-util-visit';
import { UnifiedAST, UnifiedNode, getNodeLineRange } from './contentParser';
import { FileComment } from '../../../../../services/commentsApi';
import { PRDiffData, getDiffTypeForLines, DiffBlockType } from '../types/prDiff';

export interface EnrichedNode extends UnifiedNode {
  data: {
    diffType?: DiffBlockType;
    prInfo?: {
      number: number;
      title: string;
      author?: string;
    };
    comments?: Array<{
      line: number;
      comments: FileComment[];
    }>;
    lineRange?: { start: number; end: number };
  };
}

export interface EnrichedAST extends UnifiedAST {
  children: EnrichedNode[];
}

/**
 * Enrich AST with diff information
 */
export function enrichWithDiff(ast: UnifiedAST, prDiff: PRDiffData | null): EnrichedAST {
  if (!prDiff) {
    return ast as EnrichedAST;
  }

  visit(ast, (node: UnifiedNode) => {
    const lineRange = getNodeLineRange(node);
    if (!lineRange) {
      return;
    }

    const diffType = getDiffTypeForLines(lineRange.start, lineRange.end, prDiff);

    if (diffType) {
      node.data = {
        ...node.data,
        diffType,
        prInfo: prDiff.prNumber
          ? {
              number: prDiff.prNumber,
              title: prDiff.prTitle || '',
              author: prDiff.prAuthor,
            }
          : undefined,
        lineRange,
      };
    }
  });

  return ast as EnrichedAST;
}

/**
 * Enrich AST with comment information
 */
export function enrichWithComments(ast: EnrichedAST, comments: FileComment[]): EnrichedAST {
  // Build line-to-comments map
  const commentsByLine = new Map<number, FileComment[]>();
  comments.forEach(comment => {
    const line = comment.computed_line_number;
    if (line !== null) {
      if (!commentsByLine.has(line)) {
        commentsByLine.set(line, []);
      }
      commentsByLine.get(line)!.push(comment);
    }
  });

  visit(ast, (node: UnifiedNode) => {
    const lineRange = getNodeLineRange(node);
    if (!lineRange) {
      return;
    }

    // Collect comments in this node's line range
    const nodeComments: Array<{ line: number; comments: FileComment[] }> = [];
    for (let line = lineRange.start; line <= lineRange.end; line++) {
      if (commentsByLine.has(line)) {
        nodeComments.push({
          line,
          comments: commentsByLine.get(line)!,
        });
      }
    }

    if (nodeComments.length > 0) {
      if (!node.data) {
        node.data = {};
      }
      node.data.comments = nodeComments;
    }
  });

  return ast;
}

/**
 * Full enrichment pipeline
 */
export function enrichContent(
  ast: UnifiedAST,
  prDiff: PRDiffData | null,
  comments: FileComment[]
): EnrichedAST {
  let enriched = enrichWithDiff(ast, prDiff);
  enriched = enrichWithComments(enriched, comments);
  return enriched;
}
