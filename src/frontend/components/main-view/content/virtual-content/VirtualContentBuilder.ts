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
    // Merge multiple EDIT enrichments from the same session into one before building layers.
    // At most one edit session exists per file; splitting by hunk is an implementation detail
    // of FileViewer that the builder collapses back here.
    const processedEnrichments = this.mergeEditEnrichments(this.enrichments);

    const diffEnrichments = processedEnrichments.filter(e => this.isDiffEnrichment(e));
    const referenceEnrichments = processedEnrichments.filter(e => !this.isDiffEnrichment(e));
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
    processedEnrichments.forEach(e => {
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
    // Collect approved hunks as objects (not just keys) so we can sort and walk them.
    const approvedHunks: any[] = [];

    for (const hunk of diffHunks) {
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
        approvedHunks.push(hunk);
        console.log(
          `[VirtualContent] Layer ${layerIndex} — ${label} hunk @${hunk.old_start}-${rangeEnd}: applying`
        );
      }
    }

    // Sort approved hunks by their position in the original file.
    approvedHunks.sort((a, b) => a.old_start - b.old_start);

    // Build the new layer by walking prevLayer lines and hunk lines together.
    // This correctly handles context lines, deletions and additions in order.
    const newLines: VirtualLine[] = [];
    let virtualLineNum = 1;
    let prevIdx = 0; // cursor into previousLayer.lines

    for (const hunk of approvedHunks) {
      // 1. Copy all prevLayer lines that come before this hunk's original range.
      //    Stop at the first ORIGINAL line at or after old_start; non-original
      //    lines (insertions from earlier enrichments) are also copied here since
      //    conflict detection guarantees they are outside this hunk's range.
      while (prevIdx < previousLayer.lines.length) {
        const pl = previousLayer.lines[prevIdx];
        if (pl.isOriginalLine && pl.lineNumber >= hunk.old_start) {
          break;
        }
        newLines.push({
          ...pl,
          layerIndex,
          virtualLineNumber: virtualLineNum++,
          previousLayerLine: pl.virtualLineNumber,
        });
        prevIdx++;
      }

      // 2. Walk hunk lines, synchronising with original lines in prevLayer.
      //    ' ' (context)  → emit the matching original line from prevLayer
      //    '-' (deletion) → emit a deletion VirtualLine, skip the original
      //    '+' (addition) → emit an addition VirtualLine, don't advance prevIdx
      let hunkOrigLine = hunk.old_start;
      let isFirstDiffLine = true;

      for (const hunkLine of hunk.lines as string[]) {
        const prefix = hunkLine[0];
        const content = hunkLine.slice(1);

        if (prefix === ' ') {
          // Context: emit the original prevLayer line as-is.
          // A context line also resets the diff-group boundary so the next
          // diff line in this hunk (if any) gets isFirstInDiffGroup=true.
          isFirstDiffLine = true;
          if (prevIdx < previousLayer.lines.length) {
            const pl = previousLayer.lines[prevIdx];
            newLines.push({
              ...pl,
              layerIndex,
              virtualLineNumber: virtualLineNum++,
              previousLayerLine: pl.virtualLineNumber,
            });
            prevIdx++;
          }
          hunkOrigLine++;
        } else if (prefix === '-') {
          // Deletion: emit a diff line, then skip past the original in prevLayer.
          newLines.push({
            lineNumber: hunkOrigLine,
            virtualLineNumber: virtualLineNum++,
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
          prevIdx++; // consume the original line that is being deleted
          hunkOrigLine++;
        } else if (prefix === '+') {
          // Addition: emit a diff line; the original file position doesn't advance.
          newLines.push({
            lineNumber: hunkOrigLine,
            virtualLineNumber: virtualLineNum++,
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
          // prevIdx and hunkOrigLine intentionally not advanced for additions
        }
      }
    }

    // 3. Copy all remaining prevLayer lines after the last hunk.
    while (prevIdx < previousLayer.lines.length) {
      const pl = previousLayer.lines[prevIdx];
      newLines.push({
        ...pl,
        layerIndex,
        virtualLineNumber: virtualLineNum++,
        previousLayerLine: pl.virtualLineNumber,
      });
      prevIdx++;
    }

    const inserted = newLines.filter(l => l.isInsertedLine && l.layerIndex === layerIndex).length;
    console.log(
      `  → Layer ${layerIndex} result: ${newLines.length} lines, ${inserted} new diff lines`
    );

    return { layerIndex, enrichment, lines: newLines };
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

  /**
   * Returns the original-file line numbers that are actually deleted/modified
   * by a hunk (i.e. lines prefixed with `-`). Context lines (` `) and
   * insertions (`+`) are excluded because they don't claim ownership of any
   * original line — two enrichments may freely share context overlap.
   */
  private changedOriginalLines(hunk: any): number[] {
    const changed: number[] = [];
    let oldLine: number = hunk.old_start;
    for (const line of (hunk.lines as string[] | undefined) ?? []) {
      if (line.startsWith('+')) {
        // insertion — no original line consumed
      } else if (line.startsWith('-')) {
        changed.push(oldLine);
        oldLine++;
      } else {
        // context — advance old-line counter but don't claim
        oldLine++;
      }
    }
    return changed;
  }

  private checkHunkConflict(hunk: any): Enrichment | null {
    for (const ln of this.changedOriginalLines(hunk)) {
      const existing = this.claimedRanges.get(ln);
      if (existing) {
        return existing;
      }
    }
    return null;
  }

  private claimHunkRange(hunk: any, enrichment: Enrichment): void {
    for (const ln of this.changedOriginalLines(hunk)) {
      this.claimedRanges.set(ln, enrichment);
    }
  }

  private createConflictEnrichment(
    firstEnrichment: Enrichment,
    secondEnrichment: Enrichment,
    hunk: any
  ): Enrichment {
    const changed = this.changedOriginalLines(hunk);
    const lineStart = changed.length > 0 ? changed[0] : hunk.old_start;
    const lineEnd = changed.length > 0 ? changed[changed.length - 1] : hunk.old_start;
    return {
      id: `conflict-${this.nextConflictId++}`,
      type: EnrichmentType.CONFLICT,
      lineStart,
      lineEnd,
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

  private mergeEditEnrichments(enrichments: Enrichment[]): Enrichment[] {
    const editEnrichments = enrichments.filter(e => e.type === EnrichmentType.EDIT);
    if (editEnrichments.length <= 1) {
      return enrichments;
    }

    const nonEditEnrichments = enrichments.filter(e => e.type !== EnrichmentType.EDIT);
    const bySessionId = new Map<string, Enrichment[]>();

    for (const e of editEnrichments) {
      const sessionId = (e.data as any).id ?? e.id;
      if (!bySessionId.has(sessionId)) {
        bySessionId.set(sessionId, []);
      }
      bySessionId.get(sessionId)!.push(e);
    }

    const mergedEdits: Enrichment[] = [];
    for (const group of bySessionId.values()) {
      if (group.length === 1) {
        mergedEdits.push(group[0]);
        continue;
      }
      const allHunks = group
        .flatMap(e => {
          const data = e.data as any;
          return data.current_hunk ? [data.current_hunk] : data.diff_hunks || [];
        })
        .sort((a, b) => a.old_start - b.old_start);

      mergedEdits.push({
        ...group[0],
        lineStart: Math.min(...group.map(e => e.lineStart)),
        lineEnd: Math.max(...group.map(e => e.lineEnd)),
        data: { ...group[0].data, diff_hunks: allHunks, current_hunk: undefined },
      });
    }

    return [...nonEditEnrichments, ...mergedEdits];
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
