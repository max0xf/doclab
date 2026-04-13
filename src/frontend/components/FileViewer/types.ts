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
  type: 'comment' | 'diff' | 'pr_diff' | 'local_change';
  lineStart: number;
  lineEnd: number;
  data: any;
}

export interface ContentWidgetProps {
  fileName: string;
  content: string;
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
}
