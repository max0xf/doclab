export type ViewMode = 'plain-text' | 'view';

export interface ViewModeOption {
  id: ViewMode;
  label: string;
  description: string;
}

export const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    id: 'plain-text',
    label: 'Plain Text',
    description: 'Raw text with line numbers and diff highlighting',
  },
  {
    id: 'view',
    label: 'View',
    description: 'Rendered content with inline comments and PR diffs',
  },
];
