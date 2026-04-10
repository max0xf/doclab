/**
 * Unified Enrichment System - Core Types
 *
 * Provides a format-agnostic way to attach enrichments (comments, diffs, annotations)
 * to any file format (code, YAML, Markdown, XML, etc.)
 */

/**
 * Maps raw file lines to rendered blocks/lines
 */
export interface LineMapping {
  rawLine: number; // Line number in original file (1-indexed)
  renderedBlocks: string[]; // IDs of rendered blocks this line maps to
  renderedLines?: number[]; // Line numbers in rendered output (if applicable)
}

/**
 * Raw line range in original file
 */
export interface RawMapping {
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

/**
 * Rendered block/position in output
 */
export interface RenderedMapping {
  blockIds: string[]; // Which rendered blocks
  positions?: Array<{
    // Optional: specific positions within blocks
    blockId: string;
    offset?: number; // Character offset within block
    lineOffset?: number; // Line offset within block
  }>;
}

/**
 * Visual representation of enrichment
 */
export interface EnrichmentVisual {
  markerType: 'gutter' | 'inline' | 'overlay' | 'highlight' | 'underline' | 'badge';
  color: 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple' | 'gray';
  icon?: string; // Lucide icon name
  label?: string;
  tooltip?: string;
  priority: number; // Higher = more prominent
}

/**
 * Base enrichment type
 */
export interface BaseEnrichment {
  id: string;
  type: 'comment' | 'diff' | 'annotation' | 'highlight' | 'warning' | 'error';

  // Dual mapping system
  rawMapping: RawMapping;
  renderedMapping: RenderedMapping;

  // Visual representation
  visual: EnrichmentVisual;

  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

/**
 * Comment enrichment
 */
export interface CommentEnrichment extends BaseEnrichment {
  type: 'comment';
  data: {
    text: string;
    resolved: boolean;
    replyCount: number;
    replies?: Array<{
      id: string;
      text: string;
      author: string;
      createdAt: string;
    }>;
  };
}

/**
 * Diff enrichment (PR changes)
 */
export interface DiffEnrichment extends BaseEnrichment {
  type: 'diff';
  data: {
    changeType: 'added' | 'deleted' | 'modified';
    prNumber?: number;
    prTitle?: string;
    prAuthor?: string;
    oldContent?: string;
    newContent?: string;
  };
}

/**
 * Annotation enrichment (notes, warnings, etc.)
 */
export interface AnnotationEnrichment extends BaseEnrichment {
  type: 'annotation';
  data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    category?: string;
  };
}

/**
 * Highlight enrichment (search results, references, etc.)
 */
export interface HighlightEnrichment extends BaseEnrichment {
  type: 'highlight';
  data: {
    reason: string;
    category?: string;
  };
}

/**
 * Union type of all enrichments
 */
export type Enrichment =
  | CommentEnrichment
  | DiffEnrichment
  | AnnotationEnrichment
  | HighlightEnrichment;

/**
 * Enrichment with actions
 */
export interface EnrichmentAction {
  id: string;
  label: string;
  icon?: string;
  handler: (enrichment: Enrichment) => void | Promise<void>;
  requiresInput?: boolean;
  inputSchema?: Record<string, any>;
}

/**
 * Block map - maps block IDs to line ranges
 */
export interface BlockMap {
  blockId: string;
  rawLines: number[]; // Which raw lines this block represents
  renderedLines?: number[]; // Which rendered lines (if applicable)
  type: string; // Block type (e.g., 'code', 'yaml_mapping', 'md_heading')
  metadata?: Record<string, any>;
}
