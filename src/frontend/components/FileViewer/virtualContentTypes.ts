/**
 * Virtual Content Types
 *
 * Defines the structure of layered virtual content that is passed to renderers.
 */

import { Enrichment } from './types';

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
  diffType?: 'addition' | 'deletion' | 'modification';
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
