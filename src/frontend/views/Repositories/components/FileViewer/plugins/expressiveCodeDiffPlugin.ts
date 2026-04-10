import type { ExpressiveCodePlugin } from '@expressive-code/core';
import { PRDiffData } from '../types/prDiff';

export interface DiffPluginOptions {
  prDiffData: PRDiffData | null;
}

/**
 * Custom Expressive Code plugin to add PR diff markers to code blocks
 * Uses text markers to highlight added, deleted, and modified lines
 */
export function pluginPRDiffMarkers(options: DiffPluginOptions): ExpressiveCodePlugin {
  const { prDiffData } = options;

  if (!prDiffData || !prDiffData.hunks) {
    // No diff data, return empty plugin
    return {
      name: 'PR Diff Markers',
      hooks: {},
    };
  }

  // Build line-to-change-type map
  const lineChanges = new Map<number, 'added' | 'deleted' | 'modified'>();

  prDiffData.hunks.forEach(hunk => {
    if (!hunk.changes) {
      return;
    }

    hunk.changes.forEach(change => {
      const lineNum = change.lineNumber;
      if (lineNum && change.type !== 'unchanged') {
        lineChanges.set(lineNum, change.type as 'added' | 'deleted' | 'modified');
      }
    });
  });

  return {
    name: 'PR Diff Markers',

    hooks: {
      preprocessMetadata: async ({ codeBlock }) => {
        // Build text marker syntax from PR diff data
        const addedLines: number[] = [];
        const deletedLines: number[] = [];
        const modifiedLines: number[] = [];

        lineChanges.forEach((changeType, lineNum) => {
          switch (changeType) {
            case 'added':
              addedLines.push(lineNum);
              break;
            case 'deleted':
              deletedLines.push(lineNum);
              break;
            case 'modified':
              modifiedLines.push(lineNum);
              break;
          }
        });

        // Convert to range syntax (e.g., "1-3,5,7-9")
        const toRanges = (lines: number[]): string => {
          if (lines.length === 0) {
            return '';
          }

          lines.sort((a, b) => a - b);
          const ranges: string[] = [];
          let start = lines[0];
          let end = lines[0];

          for (let i = 1; i <= lines.length; i++) {
            if (i < lines.length && lines[i] === end + 1) {
              end = lines[i];
            } else {
              ranges.push(start === end ? String(start) : `${start}-${end}`);
              if (i < lines.length) {
                start = lines[i];
                end = lines[i];
              }
            }
          }

          return ranges.join(',');
        };

        // Add text markers to meta string
        const markers: string[] = [];

        if (addedLines.length > 0) {
          markers.push(`ins={${toRanges(addedLines)}}`);
        }
        if (deletedLines.length > 0) {
          markers.push(`del={${toRanges(deletedLines)}}`);
        }
        if (modifiedLines.length > 0) {
          markers.push(`mark={${toRanges(modifiedLines)}}`);
        }

        if (markers.length > 0) {
          // Append markers to existing meta string
          codeBlock.meta = codeBlock.meta
            ? `${codeBlock.meta} ${markers.join(' ')}`
            : markers.join(' ');
        }
      },

      postprocessRenderedBlock: async () => {
        // Add custom CSS for PR diff styling
        const styles = `
          /* PR Diff Markers */
          .expressive-code .ins {
            background-color: #e6ffed !important;
            border-left: 3px solid #28a745 !important;
          }
          
          .expressive-code .del {
            background-color: #ffeef0 !important;
            border-left: 3px solid #d73a49 !important;
            text-decoration: line-through;
            opacity: 0.7;
          }
          
          .expressive-code .mark {
            background-color: #fffbdd !important;
            border-left: 3px solid #ffc107 !important;
          }
          
          /* PR Banner styling */
          .expressive-code [data-pr-number]::before {
            content: "PR #" attr(data-pr-number) " - " attr(data-pr-title);
            display: block;
            padding: 8px 12px;
            margin-bottom: 8px;
            background-color: #e3f2fd;
            border-left: 4px solid #1976d2;
            font-size: 13px;
            font-weight: 500;
            color: #1976d2;
          }
        `;

        // Add styles to the document if not already added
        if (typeof document !== 'undefined') {
          const styleId = 'expressive-code-pr-diff-markers';
          if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
          }
        }
      },
    },
  };
}
