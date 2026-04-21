/**
 * Virtual Content Types
 *
 * Defines all types for the virtual content system including enrichments,
 * view modes, and content widgets.
 */

// =============================================================================
// Enums
// =============================================================================

export enum ViewMode {
  PLAIN = 'plain',
  VISUAL = 'visual',
}

export enum EnrichmentCategory {
  REFERENCE = 'reference', // Points to a line without modifying it (comments)
  DIFF = 'diff', // Modifies content by adding/removing lines (PR diffs, commits, edits)
}

export enum EnrichmentType {
  // Reference enrichments - don't modify content
  COMMENT = 'comment',

  // Diff enrichments - modify content
  PR = 'pr_diff',
  EDIT = 'edit_session',
  COMMIT = 'commit',
}

export enum DiffType {
  ADDITION = 'addition',
  DELETION = 'deletion',
}

export enum UserChangeType {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
}

// =============================================================================
// Helper Functions
// =============================================================================

export function isDiffEnrichment(type: EnrichmentType): boolean {
  return [EnrichmentType.PR, EnrichmentType.EDIT, EnrichmentType.COMMIT].includes(type);
}

export function isReferenceEnrichment(type: EnrichmentType): boolean {
  return type === EnrichmentType.COMMENT;
}

export function getEnrichmentCategory(type: EnrichmentType): EnrichmentCategory {
  return isDiffEnrichment(type) ? EnrichmentCategory.DIFF : EnrichmentCategory.REFERENCE;
}

// =============================================================================
// View Mode Configuration
// =============================================================================

export interface ViewModeOption {
  id: ViewMode;
  label: string;
  description: string;
}

export const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    id: ViewMode.PLAIN,
    label: 'Plain Text',
    description: 'Raw text with line numbers and enrichments',
  },
  {
    id: ViewMode.VISUAL,
    label: 'Visual',
    description: 'Rendered content (Markdown/syntax highlighted)',
  },
];

// =============================================================================
// Enrichment Types
// =============================================================================

export interface Enrichment {
  id: string;
  type: EnrichmentType | string; // Allow string for backward compatibility
  lineStart: number;
  lineEnd: number;
  data: any;
}

export interface EnrichmentMetadata {
  type: EnrichmentType;
  category: EnrichmentCategory;
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

// =============================================================================
// Virtual Content Layer Types
// =============================================================================

/**
 * A single line in a virtual content layer
 */
export interface VirtualLine {
  // Line identification
  lineNumber: number; // Original line number in source content
  virtualLineNumber: number; // Sequential line number in this virtual layer

  // Content
  content: string;

  // Enrichment metadata
  enrichments: Enrichment[]; // All enrichments that apply to this line
  sourceEnrichment?: Enrichment; // The enrichment that created this line (for inserted lines)

  // Line type
  isOriginalLine: boolean; // True if from original content
  isInsertedLine: boolean; // True if inserted by an enrichment

  // Diff metadata (for inserted lines)
  diffType?: DiffType;
  isFirstInDiffGroup?: boolean; // True if first line in a group of additions/deletions

  // Conflict metadata
  hasConflict?: boolean; // True if multiple enrichments conflict on this line
  conflictingEnrichments?: Enrichment[]; // Enrichments that conflict

  // Rendering hints
  prNumber?: number; // For PR diff lines
  prTitle?: string;
  commitSha?: string; // For commit diff lines
  editId?: string; // For edit diff lines

  // Actions available for this line
  actions?: string[]; // e.g., ['commit', 'discard'], ['create_pr', 'unstage']

  // Layer tracking
  layerIndex: number; // Which layer this line belongs to (0 = original)
  previousLayerLine?: number; // Line number in previous layer that this maps to

  // Legacy fields (for backward compatibility)
  isEnrichmentLine?: boolean; // Alias for isInsertedLine
  isUserChange?: boolean; // True if this line was modified by the user
  userChangeType?: UserChangeType; // Type of user change
  isFirstInUserChangeGroup?: boolean; // True if this is the first line in a group of user changes
  isFirstInConflictGroup?: boolean; // True if this is the first line in a conflict group
}

/**
 * A layer in the virtual content
 */
export interface VirtualContentLayer {
  layerIndex: number;
  enrichment?: Enrichment; // The enrichment that created this layer (undefined for layer 0)
  lines: VirtualLine[];
}

/**
 * Complete layered virtual content structure
 */
export interface LayeredVirtualContent {
  // Original content
  originalContent: string;
  originalLines: string[];

  // All layers (layer 0 is original content)
  layers: VirtualContentLayer[];

  // Final merged view (last layer)
  finalLines: VirtualLine[];

  // Enrichments metadata
  enrichments: Enrichment[];
  enrichmentsByType: Map<string, Enrichment[]>;

  // Conflict information
  hasConflicts: boolean;
  conflictLines: Set<number>; // Line numbers with conflicts

  // Statistics
  stats: {
    totalLayers: number;
    totalLines: number;
    insertedLines: number;
    conflictCount: number;
  };
}

/**
 * Options for building virtual content
 */
export interface VirtualContentBuildOptions {
  // Whether to include reference enrichments (comments) in layers
  includeReferences?: boolean;

  // Whether to detect and mark conflicts
  detectConflicts?: boolean;

  // Custom enrichment ordering (by type)
  enrichmentOrder?: string[];
}

export interface ConflictInfo {
  lineNumber: number;
  uncommittedContent: string; // Content from edit enrichment
  committedContent: string; // Content from commit enrichment
  originalContent: string; // Original content before any changes
}
