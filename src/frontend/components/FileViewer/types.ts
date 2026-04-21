/**
 * File Viewer Types
 *
 * Defines the view modes and content widget interfaces for the file viewer.
 */

export type ViewMode = 'plain' | 'visual';

export interface ViewModeOption {
  id: ViewMode;
  label: string;
  description: string;
}

export const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    id: 'plain',
    label: 'Plain Text',
    description: 'Raw text with line numbers and enrichments',
  },
  {
    id: 'visual',
    label: 'Visual',
    description: 'Rendered content (Markdown/syntax highlighted)',
  },
];

export interface Enrichment {
  id: string;
  type: 'comment' | 'diff' | 'pr_diff' | 'local_change' | 'edit_session' | 'commit';
  lineStart: number;
  lineEnd: number;
  data: any;
}

export interface ContentWidgetProps {
  fileName: string;
  filePath?: string;
  content: string;
  originalContent?: string; // Original content before user changes
  enrichments: Enrichment[];
  isEditMode: boolean;
  onContentChange?: (newContent: string) => void;
  onLineClick?: (lineNumber: number) => void;
  onEnrichmentClick?: (enrichment: Enrichment) => void;
}

export interface VirtualLine {
  lineNumber: number; // Original line number
  virtualLineNumber: number; // Virtual line number (with enrichments inserted)
  content: string;
  enrichments: Enrichment[];
  isEnrichmentLine?: boolean; // True if this is an inserted enrichment line
  diffType?: 'addition' | 'deletion'; // Type of diff change
  prNumber?: number; // PR number for diff lines
  prTitle?: string; // PR title for diff lines
  commitSha?: string; // Commit SHA for commit diff lines
  editId?: string; // Edit ID for edit diff lines
  isFirstInDiffGroup?: boolean; // True if this is the first line in a group of additions or deletions
  isUserChange?: boolean; // True if this line was modified by the user
  userChangeType?: 'added' | 'modified' | 'deleted'; // Type of user change
  isFirstInUserChangeGroup?: boolean; // True if this is the first line in a group of user changes
  hasConflict?: boolean; // True if this line has conflicting changes (edit vs commit)
  isFirstInConflictGroup?: boolean; // True if this is the first line in a conflict group
}

export interface ConflictInfo {
  lineNumber: number;
  uncommittedContent: string; // Content from edit enrichment
  committedContent: string; // Content from commit enrichment
  originalContent: string; // Original content before any changes
}
