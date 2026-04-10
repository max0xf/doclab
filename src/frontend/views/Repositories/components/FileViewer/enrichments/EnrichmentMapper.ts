/**
 * EnrichmentMapper
 *
 * Maps enrichments between raw file lines and rendered blocks
 */

import { Enrichment, LineMapping, BlockMap, RawMapping, RenderedMapping } from './types';

export class EnrichmentMapper {
  private blockMap: Map<string, BlockMap>;
  private lineToBlocks: Map<number, string[]>;

  constructor(blocks: BlockMap[]) {
    this.blockMap = new Map();
    this.lineToBlocks = new Map();

    // Build maps
    blocks.forEach(block => {
      this.blockMap.set(block.blockId, block);

      // Map each raw line to this block
      block.rawLines.forEach(line => {
        if (!this.lineToBlocks.has(line)) {
          this.lineToBlocks.set(line, []);
        }
        this.lineToBlocks.get(line)!.push(block.blockId);
      });
    });
  }

  /**
   * Get line mapping for a raw line
   */
  getLineMapping(rawLine: number): LineMapping | null {
    const blockIds = this.lineToBlocks.get(rawLine);
    if (!blockIds || blockIds.length === 0) {
      return null;
    }

    // Collect rendered lines from all blocks
    const renderedLines: number[] = [];
    blockIds.forEach(blockId => {
      const block = this.blockMap.get(blockId);
      if (block?.renderedLines) {
        renderedLines.push(...block.renderedLines);
      }
    });

    return {
      rawLine,
      renderedBlocks: blockIds,
      renderedLines: renderedLines.length > 0 ? renderedLines : undefined,
    };
  }

  /**
   * Convert raw mapping to rendered mapping
   */
  rawToRendered(rawMapping: RawMapping): RenderedMapping {
    const blockIds = new Set<string>();

    // Find all blocks that intersect with the raw line range
    for (let line = rawMapping.startLine; line <= rawMapping.endLine; line++) {
      const blocks = this.lineToBlocks.get(line);
      if (blocks) {
        blocks.forEach(blockId => blockIds.add(blockId));
      }
    }

    return {
      blockIds: Array.from(blockIds),
    };
  }

  /**
   * Convert rendered mapping to raw mapping
   */
  renderedToRaw(renderedMapping: RenderedMapping): RawMapping | null {
    const lines = new Set<number>();

    // Collect all raw lines from the blocks
    renderedMapping.blockIds.forEach(blockId => {
      const block = this.blockMap.get(blockId);
      if (block) {
        block.rawLines.forEach(line => lines.add(line));
      }
    });

    if (lines.size === 0) {
      return null;
    }

    const sortedLines = Array.from(lines).sort((a, b) => a - b);
    return {
      startLine: sortedLines[0],
      endLine: sortedLines[sortedLines.length - 1],
    };
  }

  /**
   * Ensure enrichment has both mappings
   */
  ensureDualMapping(enrichment: Enrichment): Enrichment {
    // If missing rendered mapping, generate from raw
    if (!enrichment.renderedMapping.blockIds || enrichment.renderedMapping.blockIds.length === 0) {
      enrichment.renderedMapping = this.rawToRendered(enrichment.rawMapping);
    }

    return enrichment;
  }

  /**
   * Group enrichments by block ID
   */
  groupByBlock(enrichments: Enrichment[]): Map<string, Enrichment[]> {
    const grouped = new Map<string, Enrichment[]>();

    enrichments.forEach(enrichment => {
      const enrichmentWithMapping = this.ensureDualMapping(enrichment);

      enrichmentWithMapping.renderedMapping.blockIds.forEach(blockId => {
        if (!grouped.has(blockId)) {
          grouped.set(blockId, []);
        }
        grouped.get(blockId)!.push(enrichmentWithMapping);
      });
    });

    return grouped;
  }

  /**
   * Group enrichments by raw line
   */
  groupByLine(enrichments: Enrichment[]): Map<number, Enrichment[]> {
    const grouped = new Map<number, Enrichment[]>();

    enrichments.forEach(enrichment => {
      for (
        let line = enrichment.rawMapping.startLine;
        line <= enrichment.rawMapping.endLine;
        line++
      ) {
        if (!grouped.has(line)) {
          grouped.set(line, []);
        }
        grouped.get(line)!.push(enrichment);
      }
    });

    return grouped;
  }

  /**
   * Filter enrichments by type
   */
  filterByType<T extends Enrichment['type']>(
    enrichments: Enrichment[],
    type: T
  ): Extract<Enrichment, { type: T }>[] {
    return enrichments.filter(e => e.type === type) as Extract<Enrichment, { type: T }>[];
  }

  /**
   * Sort enrichments by priority
   */
  sortByPriority(enrichments: Enrichment[]): Enrichment[] {
    return [...enrichments].sort((a, b) => {
      // Higher priority first
      if (a.visual.priority !== b.visual.priority) {
        return b.visual.priority - a.visual.priority;
      }
      // Then by creation time
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  /**
   * Get block info
   */
  getBlock(blockId: string): BlockMap | undefined {
    return this.blockMap.get(blockId);
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): BlockMap[] {
    return Array.from(this.blockMap.values());
  }
}
