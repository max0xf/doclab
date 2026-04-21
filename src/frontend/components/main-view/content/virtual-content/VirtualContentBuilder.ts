/**
 * Virtual Content Builder
 *
 * Builds layered virtual content from original content and enrichments.
 * Each enrichment creates a new layer, allowing natural conflict detection.
 */

import {
  Enrichment,
  EnrichmentType,
  DiffType,
  isDiffEnrichment as isEnrichmentDiff,
  LayeredVirtualContent,
  VirtualContentLayer,
  VirtualLine,
  VirtualContentBuildOptions,
} from './types';

export class VirtualContentBuilder {
  private originalContent: string;
  private originalLines: string[];
  private enrichments: Enrichment[];
  private options: VirtualContentBuildOptions;

  constructor(
    originalContent: string,
    enrichments: Enrichment[],
    options: VirtualContentBuildOptions = {}
  ) {
    this.originalContent = originalContent;
    this.originalLines = originalContent.split('\n');
    this.enrichments = enrichments;
    this.options = {
      includeReferences: false,
      detectConflicts: true,
      ...options,
    };
  }

  /**
   * Build the complete layered virtual content
   */
  build(): LayeredVirtualContent {
    console.group('[VirtualContentBuilder] Building layered content');
    console.log('Original lines:', this.originalLines.length);
    console.log('Total enrichments:', this.enrichments.length);

    // Separate enrichments by category
    const diffEnrichments = this.enrichments.filter(e => this.isDiffEnrichment(e));
    const referenceEnrichments = this.enrichments.filter(e => !this.isDiffEnrichment(e));

    console.log('Diff enrichments:', diffEnrichments.length);
    console.log('Reference enrichments:', referenceEnrichments.length);

    // Sort diff enrichments by priority (pr_diff -> commit -> edit)
    const sortedDiffEnrichments = this.sortEnrichmentsByPriority(diffEnrichments);

    // Build layers
    const layers: VirtualContentLayer[] = [];

    // Layer 0: Original content
    const layer0 = this.buildOriginalLayer();
    layers.push(layer0);

    // Apply each diff enrichment as a new layer
    let previousLayer = layer0;
    for (let i = 0; i < sortedDiffEnrichments.length; i++) {
      const enrichment = sortedDiffEnrichments[i];
      console.log(`Building layer ${i + 1} for enrichment type: ${enrichment.type}`);

      const newLayer = this.applyDiffEnrichment(previousLayer, enrichment, i + 1);
      layers.push(newLayer);
      previousLayer = newLayer;
    }

    // Get final lines from last layer
    const finalLines = layers[layers.length - 1].lines;

    // Add reference enrichments to final lines
    this.applyReferenceEnrichments(finalLines, referenceEnrichments);

    // Detect conflicts
    const conflictInfo = this.detectConflicts(layers);

    // Build enrichments map
    const enrichmentsByType = new Map<string, Enrichment[]>();
    this.enrichments.forEach(e => {
      const type = e.type;
      if (!enrichmentsByType.has(type)) {
        enrichmentsByType.set(type, []);
      }
      enrichmentsByType.get(type)!.push(e);
    });

    // Calculate statistics
    const stats = {
      totalLayers: layers.length,
      totalLines: finalLines.length,
      insertedLines: finalLines.filter(l => l.isInsertedLine).length,
      conflictCount: conflictInfo.conflictLines.size,
    };

    console.log('Layers built:', layers.length);
    console.log('Final lines:', finalLines.length);
    console.log('Conflicts detected:', stats.conflictCount);
    console.groupEnd();

    return {
      originalContent: this.originalContent,
      originalLines: this.originalLines,
      layers,
      finalLines,
      enrichments: this.enrichments,
      enrichmentsByType,
      hasConflicts: conflictInfo.hasConflicts,
      conflictLines: conflictInfo.conflictLines,
      stats,
    };
  }

  /**
   * Build layer 0 (original content)
   */
  private buildOriginalLayer(): VirtualContentLayer {
    const lines: VirtualLine[] = this.originalLines.map((content, index) => ({
      lineNumber: index + 1,
      virtualLineNumber: index + 1,
      content,
      enrichments: [],
      isOriginalLine: true,
      isInsertedLine: false,
      layerIndex: 0,
    }));

    return {
      layerIndex: 0,
      lines,
    };
  }

  /**
   * Apply a diff enrichment to create a new layer
   */
  private applyDiffEnrichment(
    previousLayer: VirtualContentLayer,
    enrichment: Enrichment,
    layerIndex: number
  ): VirtualContentLayer {
    const newLines: VirtualLine[] = [];
    const enrichmentData = enrichment.data as any;
    const diffHunks =
      enrichmentData.diff_hunks || enrichmentData.current_hunk ? [enrichmentData.current_hunk] : [];

    if (!diffHunks || diffHunks.length === 0) {
      // No diffs, just copy previous layer
      return {
        layerIndex,
        enrichment,
        lines: previousLayer.lines.map(line => ({
          ...line,
          layerIndex,
        })),
      };
    }

    // Process each hunk
    const processedHunks = new Set<string>();
    let virtualLineNum = 1;

    previousLayer.lines.forEach(prevLine => {
      // Check if this line is the start of a hunk
      const matchingHunk = diffHunks.find((hunk: any) => {
        const hunkKey = `${hunk.old_start}-${hunk.old_count}`;
        return hunk.old_start === prevLine.lineNumber && !processedHunks.has(hunkKey);
      });

      if (matchingHunk) {
        // Mark hunk as processed
        const hunkKey = `${matchingHunk.old_start}-${matchingHunk.old_count}`;
        processedHunks.add(hunkKey);

        // Insert diff lines
        const diffLines = this.processDiffHunk(
          matchingHunk,
          enrichment,
          layerIndex,
          prevLine.lineNumber
        );
        diffLines.forEach(diffLine => {
          newLines.push({
            ...diffLine,
            virtualLineNumber: virtualLineNum++,
          });
        });
      } else {
        // Copy line from previous layer
        newLines.push({
          ...prevLine,
          layerIndex,
          virtualLineNumber: virtualLineNum++,
          previousLayerLine: prevLine.virtualLineNumber,
        });
      }
    });

    return {
      layerIndex,
      enrichment,
      lines: newLines,
    };
  }

  /**
   * Process a diff hunk and return virtual lines
   */
  private processDiffHunk(
    hunk: any,
    enrichment: Enrichment,
    layerIndex: number,
    originalLineNumber: number
  ): VirtualLine[] {
    const lines: VirtualLine[] = [];
    let lastDiffType: DiffType | null = null;

    hunk.lines.forEach((hunkLine: string) => {
      const prefix = hunkLine[0];
      const content = hunkLine.slice(1);

      if (prefix === '-') {
        // Deletion
        const isFirst = lastDiffType !== DiffType.DELETION;
        lines.push({
          lineNumber: originalLineNumber,
          virtualLineNumber: 0, // Will be set later
          content,
          enrichments: [],
          sourceEnrichment: enrichment,
          isOriginalLine: false,
          isInsertedLine: true,
          diffType: DiffType.DELETION,
          isFirstInDiffGroup: isFirst,
          layerIndex,
          ...this.getEnrichmentMetadata(enrichment),
        });
        lastDiffType = DiffType.DELETION;
      } else if (prefix === '+') {
        // Addition
        const isFirst = lastDiffType !== DiffType.ADDITION;
        lines.push({
          lineNumber: originalLineNumber,
          virtualLineNumber: 0, // Will be set later
          content,
          enrichments: [],
          sourceEnrichment: enrichment,
          isOriginalLine: false,
          isInsertedLine: true,
          diffType: DiffType.ADDITION,
          isFirstInDiffGroup: isFirst,
          layerIndex,
          ...this.getEnrichmentMetadata(enrichment),
        });
        lastDiffType = DiffType.ADDITION;
      }
      // Skip context lines - they're already in the previous layer
    });

    return lines;
  }

  /**
   * Get enrichment-specific metadata for virtual lines
   */
  private getEnrichmentMetadata(enrichment: Enrichment): Partial<VirtualLine> {
    const data = enrichment.data as any;
    const metadata: Partial<VirtualLine> = {};

    if (enrichment.type === EnrichmentType.PR) {
      metadata.prNumber = data.pr_number;
      metadata.prTitle = data.pr_title;
    } else if (enrichment.type === EnrichmentType.COMMIT) {
      metadata.commitSha = data.commit_sha;
      metadata.actions = data.actions;
    } else if (enrichment.type === EnrichmentType.EDIT) {
      metadata.editId = data.id;
      metadata.actions = data.actions;
    }

    return metadata;
  }

  /**
   * Apply reference enrichments (comments) to final lines
   */
  private applyReferenceEnrichments(finalLines: VirtualLine[], referenceEnrichments: Enrichment[]) {
    referenceEnrichments.forEach(enrichment => {
      const lineStart = enrichment.lineStart;
      const lineEnd = enrichment.lineEnd;

      for (let lineNum = lineStart; lineNum <= lineEnd; lineNum++) {
        const line = finalLines.find(l => l.lineNumber === lineNum);
        if (line) {
          line.enrichments.push(enrichment);
        }
      }
    });
  }

  /**
   * Detect conflicts between layers
   */
  private detectConflicts(layers: VirtualContentLayer[]): {
    hasConflicts: boolean;
    conflictLines: Set<number>;
  } {
    const conflictLines = new Set<number>();

    if (!this.options.detectConflicts || layers.length <= 1) {
      return { hasConflicts: false, conflictLines };
    }

    // Check each line in the final layer
    const finalLayer = layers[layers.length - 1];

    finalLayer.lines.forEach(line => {
      // Count how many different enrichments modified this line
      const modifyingEnrichments = new Set<string>();

      layers.forEach(layer => {
        if (layer.enrichment) {
          const layerLine = layer.lines.find(
            l => l.lineNumber === line.lineNumber && l.isInsertedLine
          );
          if (layerLine) {
            modifyingEnrichments.add(layer.enrichment.type);
          }
        }
      });

      // Conflict if 2+ enrichments modified the same line
      if (modifyingEnrichments.size >= 2) {
        conflictLines.add(line.lineNumber);
        line.hasConflict = true;
        line.conflictingEnrichments = layers
          .filter(l => l.enrichment)
          .map(l => l.enrichment!)
          .filter(e => modifyingEnrichments.has(e.type));
      }
    });

    return {
      hasConflicts: conflictLines.size > 0,
      conflictLines,
    };
  }

  /**
   * Check if enrichment is a diff type
   */
  private isDiffEnrichment(enrichment: Enrichment): boolean {
    return isEnrichmentDiff(enrichment.type as EnrichmentType);
  }

  /**
   * Sort enrichments by priority (pr_diff -> commit -> edit)
   */
  private sortEnrichmentsByPriority(enrichments: Enrichment[]): Enrichment[] {
    const priorityOrder = this.options.enrichmentOrder || [
      EnrichmentType.PR,
      EnrichmentType.COMMIT,
      EnrichmentType.EDIT,
    ];

    return [...enrichments].sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);

      // If not in priority list, put at end
      const aIndex = aPriority === -1 ? 999 : aPriority;
      const bIndex = bPriority === -1 ? 999 : bPriority;

      return aIndex - bIndex;
    });
  }
}
