/**
 * PR Diff Types for View Mode Rendering
 */

export type DiffBlockType = 'added' | 'deleted' | 'modified' | 'unchanged';

// Unified enrichment type
// Enrichments are extensions to original content that can be:
// - Diffs (PR changes, user edits)
// - Visual content (diagrams, tables, charts)
// - Annotations (comments, suggestions, highlights)
// - Metadata (tags, labels, references)
export interface Enrichment {
  type: 'pr-diff' | 'user-changes' | 'comment' | 'diagram' | 'table' | 'annotation';
  category: 'diff' | 'visual' | 'metadata' | 'annotation';
  data: any; // Type-specific data structure
  priority: number; // Higher priority enrichments override lower ones
  // Optional: line range this enrichment applies to
  lineRange?: {
    start: number;
    end: number;
  };
}

export interface PRDiffChange {
  type: DiffBlockType;
  lineNumber: number;
  content: string;
  oldLineNumber?: number;
}

export interface PRDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: PRDiffChange[];
}

export interface UserChangeDiffData {
  hunks: PRDiffHunk[];
  user_change: {
    id: number;
    created_at: string;
    updated_at: string;
    status: string;
  };
}

export interface PRDiffData {
  prNumber?: number;
  prTitle?: string;
  prAuthor?: string;
  hunks?: PRDiffHunk[];
}

export interface ContentBlock {
  key: string;
  startLine: number;
  endLine: number;
  content: string;
  diffType?: DiffBlockType;
  prInfo?: {
    number: number;
    title: string;
    author: string;
  };
}

/**
 * Get diff type for a line range
 */
export function getDiffTypeForLines(
  startLine: number,
  endLine: number,
  prDiff?: PRDiffData | null
): DiffBlockType | undefined {
  if (!prDiff || !prDiff.hunks) {
    return undefined;
  }

  let hasAdded = false;
  let hasDeleted = false;
  let hasModified = false;

  // Check all hunks for changes in this line range
  for (const hunk of prDiff.hunks) {
    if (!hunk.changes) {
      continue;
    }

    for (let line = startLine; line <= endLine; line++) {
      const change = hunk.changes.find(c => c.lineNumber === line);
      if (change) {
        switch (change.type) {
          case 'added':
            hasAdded = true;
            break;
          case 'deleted':
            hasDeleted = true;
            break;
          case 'modified':
            hasModified = true;
            break;
        }
      }
    }
  }

  // Determine overall diff type for block
  if (hasModified) {
    return 'modified';
  }
  if (hasAdded && hasDeleted) {
    return 'modified';
  }
  if (hasAdded) {
    return 'added';
  }
  if (hasDeleted) {
    return 'deleted';
  }

  return undefined;
}

/**
 * Get block styling based on comments and diff type
 */
export function getBlockStyle(hasComments: boolean, diffType?: DiffBlockType) {
  let borderLeft = 'none';
  let backgroundColor = 'transparent';

  // Comments take priority for styling
  if (hasComments) {
    borderLeft = '3px solid #ff9800';
    backgroundColor = '#fff4e5';
  } else if (diffType) {
    switch (diffType) {
      case 'added':
        borderLeft = '3px solid #28a745';
        backgroundColor = '#e6ffed';
        break;
      case 'deleted':
        borderLeft = '3px solid #d73a49';
        backgroundColor = '#ffeef0';
        break;
      case 'modified':
        borderLeft = '3px solid #ffc107';
        backgroundColor = '#fffbdd';
        break;
    }
  }

  return { borderLeft, backgroundColor };
}
