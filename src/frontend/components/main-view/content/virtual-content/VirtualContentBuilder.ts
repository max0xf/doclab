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

  // Tracks which original line numbers have been claimed by which enrichment.
  // When a new enrichment tries to modify an already-claimed line, it's a conflict.
  private claimedRanges = new Map<number, Enrichment>();
  private generatedConflicts: Enrichment[] = [];
  private nextConflictId = 1;

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

  build(): LayeredVirtualContent {
    const diffEnrichments = this.enrichments.filter(e => this.isDiffEnrichment(e));
    const referenceEnrichments = this.enrichments.filter(e => !this.isDiffEnrichment(e));
    const sorted = this.sortEnrichmentsByPriority(diffEnrichments);

    console.log(
      `[VirtualContent] Build start: ${this.originalLines.length} original lines, ` +
        `${sorted.length} diff enrichments, ${referenceEnrichments.length} reference enrichments`
    );

    const layers: VirtualContentLayer[] = [this.buildOriginalLayer()];
    let previousLayer = layers[0];

    for (let i = 0; i < sorted.length; i++) {
      const enrichment = sorted[i];
      const newLayer = this.applyDiffEnrichment(previousLayer, enrichment, i + 1);
      layers.push(newLayer);
      previousLayer = newLayer;
    }

    const finalLines = layers[layers.length - 1].lines;

    // Apply comments + generated conflict enrichments as reference overlays
    const allReferenceEnrichments = [...referenceEnrichments, ...this.generatedConflicts];
    this.applyReferenceEnrichments(finalLines, allReferenceEnrichments);

    const enrichmentsByType = new Map<string, Enrichment[]>();
    this.enrichments.forEach(e => {
      if (!enrichmentsByType.has(e.type)) {
        enrichmentsByType.set(e.type, []);
      }
      enrichmentsByType.get(e.type)!.push(e);
    });

    const conflictLines = new Set(this.generatedConflicts.map(c => c.lineStart));
    const stats = {
      totalLayers: layers.length,
      totalLines: finalLines.length,
      insertedLines: finalLines.filter(l => l.isInsertedLine).length,
      conflictCount: this.generatedConflicts.length,
    };

    console.log(
      `[VirtualContent] Build complete: ${stats.totalLines} lines total, ` +
        `${stats.insertedLines} inserted, ${stats.conflictCount} conflict(s)`
    );

    return {
      originalContent: this.originalContent,
      originalLines: this.originalLines,
      layers,
      finalLines,
      enrichments: this.enrichments,
      enrichmentsByType,
      hasConflicts: this.generatedConflicts.length > 0,
      conflictLines,
      stats,
    };
  }

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
    return { layerIndex: 0, lines };
  }

  private applyDiffEnrichment(
    previousLayer: VirtualContentLayer,
    enrichment: Enrichment,
    layerIndex: number
  ): VirtualContentLayer {
    const enrichmentData = enrichment.data as any;
    const diffHunks = enrichmentData.current_hunk
      ? [enrichmentData.current_hunk]
      : enrichmentData.diff_hunks || [];

    const label = this.enrichmentLabel(enrichment);

    if (!diffHunks || diffHunks.length === 0) {
      console.log(`[VirtualContent] Layer ${layerIndex} — ${label}: no hunks, skipped`);
      return {
        layerIndex,
        enrichment,
        lines: previousLayer.lines.map(line => ({ ...line, layerIndex })),
      };
    }

    // Pre-scan: decide per hunk whether to apply or generate a conflict enrichment.
    // This must be done before iterating lines so we don't partially claim ranges.
    const hunksToApply = new Set<string>();

    for (const hunk of diffHunks) {
      const hunkKey = `${hunk.old_start}-${hunk.old_count}`;
      const rangeEnd = hunk.old_start + Math.max(hunk.old_count - 1, 0);
      const conflicting = this.checkHunkConflict(hunk);

      if (conflicting) {
        const conflictLabel = this.enrichmentLabel(conflicting);
        console.log(
          `[VirtualContent] Layer ${layerIndex} — ${label} hunk @${hunk.old_start}-${rangeEnd}: ` +
            `CONFLICT with ${conflictLabel} → conflict enrichment at line ${hunk.old_start}`
        );
        this.generatedConflicts.push(this.createConflictEnrichment(conflicting, enrichment, hunk));
      } else {
        this.claimHunkRange(hunk, enrichment);
        hunksToApply.add(hunkKey);
        console.log(
          `[VirtualContent] Layer ${layerIndex} — ${label} hunk @${hunk.old_start}-${rangeEnd}: applying`
        );
      }
    }

    // Build the new layer, inserting diff lines only for non-conflicting hunks.
    const newLines: VirtualLine[] = [];
    const processedHunks = new Set<string>();
    let virtualLineNum = 1;

    previousLayer.lines.forEach(prevLine => {
      const matchingHunk = diffHunks.find((hunk: any) => {
        const hunkKey = `${hunk.old_start}-${hunk.old_count}`;
        return (
          hunk.old_start === prevLine.lineNumber &&
          !processedHunks.has(hunkKey) &&
          hunksToApply.has(hunkKey)
        );
      });

      if (matchingHunk) {
        const hunkKey = `${matchingHunk.old_start}-${matchingHunk.old_count}`;
        processedHunks.add(hunkKey);
        const diffLines = this.processDiffHunk(
          matchingHunk,
          enrichment,
          layerIndex,
          prevLine.lineNumber
        );
        diffLines.forEach(diffLine => {
          newLines.push({ ...diffLine, virtualLineNumber: virtualLineNum++ });
        });
      } else {
        newLines.push({
          ...prevLine,
          layerIndex,
          virtualLineNumber: virtualLineNum++,
          previousLayerLine: prevLine.virtualLineNumber,
        });
      }
    });

    const inserted = newLines.filter(l => l.isInsertedLine && l.layerIndex === layerIndex).length;
    console.log(
      `  → Layer ${layerIndex} result: ${newLines.length} lines, ${inserted} new diff lines`
    );

    return { layerIndex, enrichment, lines: newLines };
  }

  private processDiffHunk(
    hunk: any,
    enrichment: Enrichment,
    layerIndex: number,
    originalLineNumber: number
  ): VirtualLine[] {
    const lines: VirtualLine[] = [];
    let isFirstDiffLine = true;

    hunk.lines.forEach((hunkLine: string) => {
      const prefix = hunkLine[0];
      const content = hunkLine.slice(1);

      if (prefix === '-') {
        lines.push({
          lineNumber: originalLineNumber,
          virtualLineNumber: 0,
          content,
          enrichments: [],
          sourceEnrichment: enrichment,
          isOriginalLine: false,
          isInsertedLine: true,
          diffType: DiffType.DELETION,
          isFirstInDiffGroup: isFirstDiffLine,
          layerIndex,
          ...this.getEnrichmentMetadata(enrichment),
        });
        isFirstDiffLine = false;
      } else if (prefix === '+') {
        lines.push({
          lineNumber: originalLineNumber,
          virtualLineNumber: 0,
          content,
          enrichments: [],
          sourceEnrichment: enrichment,
          isOriginalLine: false,
          isInsertedLine: true,
          diffType: DiffType.ADDITION,
          isFirstInDiffGroup: isFirstDiffLine,
          layerIndex,
          ...this.getEnrichmentMetadata(enrichment),
        });
        isFirstDiffLine = false;
      }
      // Context lines (' ') are already present in the previous layer — skip them.
    });

    return lines;
  }

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

  private applyReferenceEnrichments(finalLines: VirtualLine[], referenceEnrichments: Enrichment[]) {
    referenceEnrichments.forEach(enrichment => {
      for (let lineNum = enrichment.lineStart; lineNum <= enrichment.lineEnd; lineNum++) {
        const line = finalLines.find(l => l.lineNumber === lineNum);
        if (line) {
          line.enrichments.push(enrichment);
        }
      }
    });
  }

  // --- Conflict helpers ---

  private checkHunkConflict(hunk: any): Enrichment | null {
    const rangeEnd = hunk.old_start + Math.max(hunk.old_count - 1, 0);
    for (let ln = hunk.old_start; ln <= rangeEnd; ln++) {
      const existing = this.claimedRanges.get(ln);
      if (existing) {
        return existing;
      }
    }
    return null;
  }

  private claimHunkRange(hunk: any, enrichment: Enrichment): void {
    const rangeEnd = hunk.old_start + Math.max(hunk.old_count - 1, 0);
    for (let ln = hunk.old_start; ln <= rangeEnd; ln++) {
      this.claimedRanges.set(ln, enrichment);
    }
  }

  private createConflictEnrichment(
    firstEnrichment: Enrichment,
    secondEnrichment: Enrichment,
    hunk: any
  ): Enrichment {
    return {
      id: `conflict-${this.nextConflictId++}`,
      type: EnrichmentType.CONFLICT,
      lineStart: hunk.old_start,
      lineEnd: hunk.old_start + Math.max(hunk.old_count - 1, 0),
      data: {
        firstEnrichment,
        secondEnrichment,
        hunk,
      },
    };
  }

  private enrichmentLabel(enrichment: Enrichment): string {
    const d = enrichment.data as any;
    if (enrichment.type === EnrichmentType.PR) {
      return `pr_diff PR#${d.pr_number}`;
    }
    if (enrichment.type === EnrichmentType.COMMIT) {
      return `commit ${String(d.commit_sha).slice(0, 7)}`;
    }
    if (enrichment.type === EnrichmentType.EDIT) {
      return `edit_session ${String(d.id).slice(0, 8)}`;
    }
    return enrichment.type;
  }

  private isDiffEnrichment(enrichment: Enrichment): boolean {
    return isEnrichmentDiff(enrichment.type as EnrichmentType);
  }

  private sortEnrichmentsByPriority(enrichments: Enrichment[]): Enrichment[] {
    const priorityOrder = this.options.enrichmentOrder || [
      EnrichmentType.PR,
      EnrichmentType.COMMIT,
      EnrichmentType.EDIT,
    ];

    return [...enrichments].sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a.type);
      const bIndex = priorityOrder.indexOf(b.type);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }
}
