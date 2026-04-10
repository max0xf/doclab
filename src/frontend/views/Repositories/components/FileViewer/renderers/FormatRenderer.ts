/**
 * FormatRenderer Interface
 *
 * Common interface that all format renderers must implement
 */

import { ReactNode } from 'react';
import { BlockMap, Enrichment } from '../enrichments/types';
import { ContentTypeInfo } from '../utils/contentTypeDetector';

/**
 * Parse result with block mapping
 */
export interface ParseResult {
  ast: any; // Format-specific AST
  blocks: BlockMap[]; // Block ID to line mapping
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Render options
 */
export interface RenderOptions {
  showLineNumbers?: boolean;
  enableInteractions?: boolean;
  theme?: 'light' | 'dark';
  onEnrichmentClick?: (enrichment: Enrichment) => void;
  onLineClick?: (lineNumber: number) => void;
  prDiffData?: any; // PR diff data for badges and navigation
}

/**
 * Base interface for all format renderers
 */
export interface FormatRenderer {
  /**
   * Format name
   */
  name: string;

  /**
   * Supported content types
   */
  supportedTypes: ContentTypeInfo['type'][];

  /**
   * Supported enrichment types
   */
  supportedEnrichments: Enrichment['type'][];

  /**
   * Parse content and generate block map
   */
  parse(content: string, contentType: ContentTypeInfo, prDiffData?: any): ParseResult;

  /**
   * Render content with enrichments
   */
  render(parseResult: ParseResult, enrichments: Enrichment[], options: RenderOptions): ReactNode;

  /**
   * Check if this renderer can handle the content type
   */
  canHandle(contentType: ContentTypeInfo): boolean;
}

/**
 * Registry for format renderers
 */
export class FormatRendererRegistry {
  private renderers: Map<string, FormatRenderer> = new Map();

  register(renderer: FormatRenderer): void {
    this.renderers.set(renderer.name, renderer);
  }

  getRenderer(contentType: ContentTypeInfo): FormatRenderer | null {
    for (const renderer of this.renderers.values()) {
      if (renderer.canHandle(contentType)) {
        return renderer;
      }
    }
    return null;
  }

  getAllRenderers(): FormatRenderer[] {
    return Array.from(this.renderers.values());
  }
}

// Global registry instance
export const formatRendererRegistry = new FormatRendererRegistry();
