/**
 * YAML Format Renderer
 *
 * Renders YAML files as collapsible tree with enrichments
 */

import React from 'react';
import yaml from 'js-yaml';
import { FormatRenderer, ParseResult, RenderOptions } from './FormatRenderer';
import { ContentTypeInfo } from '../utils/contentTypeDetector';
import { Enrichment, BlockMap } from '../enrichments/types';
import { YAMLTreeView } from '../components/YAMLTreeView';
import { PRDiffData } from '../types/prDiff';
import { UnifiedNode } from '../utils/contentParser';

type ChangeType = 'added' | 'deleted' | 'modified' | 'unchanged';

interface NodeChange {
  path: string;
  changeType: ChangeType;
  oldValue?: any;
  newValue?: any;
}

/**
 * Deep compare two YAML objects and return a map of changes
 */
function _compareYAMLStructures(
  oldObj: any,
  newObj: any,
  path: string = ''
): Map<string, NodeChange> {
  const changes = new Map<string, NodeChange>();

  // Handle null/undefined cases
  if (oldObj === null || oldObj === undefined) {
    if (newObj !== null && newObj !== undefined) {
      changes.set(path, { path, changeType: 'added', newValue: newObj });
    }
    return changes;
  }

  if (newObj === null || newObj === undefined) {
    changes.set(path, { path, changeType: 'deleted', oldValue: oldObj });
    return changes;
  }

  // Both are arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= oldObj.length) {
        changes.set(itemPath, { path: itemPath, changeType: 'added', newValue: newObj[i] });
      } else if (i >= newObj.length) {
        changes.set(itemPath, { path: itemPath, changeType: 'deleted', oldValue: oldObj[i] });
      } else {
        const subChanges = _compareYAMLStructures(oldObj[i], newObj[i], itemPath);
        subChanges.forEach((change, key) => changes.set(key, change));
      }
    }
    return changes;
  }

  // Both are objects
  if (typeof oldObj === 'object' && typeof newObj === 'object') {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    allKeys.forEach(key => {
      const keyPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (!(key in oldObj)) {
        changes.set(keyPath, { path: keyPath, changeType: 'added', newValue: newVal });
      } else if (!(key in newObj)) {
        changes.set(keyPath, { path: keyPath, changeType: 'deleted', oldValue: oldVal });
      } else if (typeof oldVal !== typeof newVal) {
        changes.set(keyPath, {
          path: keyPath,
          changeType: 'modified',
          oldValue: oldVal,
          newValue: newVal,
        });
      } else if (typeof oldVal === 'object') {
        const subChanges = _compareYAMLStructures(oldVal, newVal, keyPath);
        subChanges.forEach((change, subKey) => changes.set(subKey, change));
      } else if (oldVal !== newVal) {
        changes.set(keyPath, {
          path: keyPath,
          changeType: 'modified',
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    });
    return changes;
  }

  // Primitive values
  if (oldObj !== newObj) {
    changes.set(path, { path, changeType: 'modified', oldValue: oldObj, newValue: newObj });
  }

  return changes;
}

/**
 * Reconstruct old YAML content from current content and diff hunks
 */
function _reconstructOldYAML(currentContent: string, prDiffData: PRDiffData | null): string | null {
  if (!prDiffData || !prDiffData.hunks || prDiffData.hunks.length === 0) {
    return null;
  }

  const currentLines = currentContent.split('\n');
  const oldLines: string[] = [];
  let currentLineIndex = 0;

  console.log('reconstructOldYAML - hunks:', prDiffData.hunks);

  prDiffData.hunks.forEach((hunk: any, hunkIndex: number) => {
    const lines = hunk.lines || [];
    const oldStart = hunk.old_start || hunk.oldStart || 0;
    const newStart = hunk.new_start || hunk.newStart || 0;

    console.log(
      `reconstructOldYAML - hunk ${hunkIndex}: old_start=${oldStart}, new_start=${newStart}, lines=${lines.length}`
    );

    // Copy unchanged lines before this hunk
    while (currentLineIndex < newStart - 1) {
      oldLines.push(currentLines[currentLineIndex]);
      currentLineIndex++;
    }

    // Process hunk lines
    let deleteCount = 0;
    let addCount = 0;
    let contextCount = 0;

    lines.forEach((lineObj: any, lineIndex: number) => {
      const lineType = typeof lineObj === 'object' ? lineObj.type : undefined;
      const lineContent =
        typeof lineObj === 'string' ? lineObj : lineObj.content || lineObj.line || '';

      if (
        lineType === 'context' ||
        (typeof lineObj === 'string' && lineContent.charAt(0) === ' ')
      ) {
        // Context line - exists in both old and new
        const content = lineType ? lineContent : lineContent.substring(1);
        oldLines.push(content);
        currentLineIndex++;
        contextCount++;
      } else if (
        lineType === 'delete' ||
        (typeof lineObj === 'string' && lineContent.charAt(0) === '-')
      ) {
        // Deleted line - exists in old but not new
        const content = lineType ? lineContent : lineContent.substring(1);
        oldLines.push(content);
        deleteCount++;
        if (lineIndex < 5 || deleteCount <= 3) {
          console.log(`  Line ${lineIndex}: DELETE - "${content.substring(0, 50)}..."`);
        }
        // Don't increment currentLineIndex - this line doesn't exist in current
      } else if (
        lineType === 'add' ||
        (typeof lineObj === 'string' && lineContent.charAt(0) === '+')
      ) {
        // Added line - exists in new but not old
        // Skip from current content and increment index
        currentLineIndex++;
        addCount++;
        if (lineIndex < 5 || addCount <= 3) {
          console.log(`  Line ${lineIndex}: ADD - "${lineContent.substring(0, 50)}..."`);
        }
      }
    });

    console.log(
      `reconstructOldYAML - hunk ${hunkIndex} summary: ${contextCount} context, ${deleteCount} deleted, ${addCount} added`
    );
  });

  // Copy remaining lines after last hunk
  while (currentLineIndex < currentLines.length) {
    oldLines.push(currentLines[currentLineIndex]);
    currentLineIndex++;
  }

  return oldLines.join('\n');
}

export class YAMLFormatRenderer implements FormatRenderer {
  name = 'yaml';
  supportedTypes: ContentTypeInfo['type'][] = ['code'];
  supportedEnrichments: Enrichment['type'][] = ['comment', 'diff', 'annotation', 'highlight'];

  canHandle(contentType: ContentTypeInfo): boolean {
    return contentType.type === 'code' && contentType.language === 'yaml';
  }

  parse(
    content: string,
    _contentType: ContentTypeInfo,
    prDiffData?: PRDiffData | null
  ): ParseResult {
    try {
      // Build ephemeral content by inserting deleted lines from PR diff
      let ephemeralContent = content;
      let changeMap: Map<string, NodeChange> | undefined;
      const lineChangeTypes = new Map<number, 'add' | 'delete' | 'context'>(); // Track change type per ephemeral line

      if (prDiffData && prDiffData.hunks && prDiffData.hunks.length > 0) {
        console.log('YAMLFormatRenderer - Building ephemeral YAML content with deleted lines...');

        const currentLines = content.split('\n');
        const ephemeralLines: string[] = [];
        let currentLineIndex = 0;
        let ephemeralLineNumber = 0;

        prDiffData.hunks.forEach((hunk: any) => {
          const hunkNewStart = hunk.new_start || hunk.newStart;

          // Add lines before this hunk
          while (currentLineIndex < hunkNewStart - 1) {
            ephemeralLines.push(currentLines[currentLineIndex]);
            ephemeralLineNumber++;
            currentLineIndex++;
          }

          // Process hunk lines
          hunk.lines?.forEach((line: any) => {
            ephemeralLineNumber++;
            if (line.type === 'delete') {
              // Insert deleted line into ephemeral content
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'delete');
            } else if (line.type === 'add') {
              // Added line (already in current content)
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'add');
              currentLineIndex++;
            } else {
              // Context line
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'context');
              currentLineIndex++;
            }
          });
        });

        // Add remaining lines
        while (currentLineIndex < currentLines.length) {
          ephemeralLines.push(currentLines[currentLineIndex]);
          ephemeralLineNumber++;
          currentLineIndex++;
        }

        ephemeralContent = ephemeralLines.join('\n');
        console.log(
          'YAMLFormatRenderer - Ephemeral content built:',
          ephemeralContent.length,
          'chars'
        );
        console.log(
          'YAMLFormatRenderer - Line change types:',
          Array.from(lineChangeTypes.entries()).slice(0, 40)
        );
      }

      // Parse the ephemeral content (includes deleted lines)
      const parsed = yaml.load(ephemeralContent, { json: false });
      const lines = ephemeralContent.split('\n');
      const lineMap = this.buildYAMLLineMap(lines);

      // Build content-to-line map for array items
      const contentToLineMap = new Map<string, number[]>();
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
          const content = trimmed.substring(2).trim();
          if (!contentToLineMap.has(content)) {
            contentToLineMap.set(content, []);
          }
          contentToLineMap.get(content)!.push(index + 1);
        }
      });

      console.log(
        'YAMLFormatRenderer - contentToLineMap for cypilot:',
        contentToLineMap.get('cypilot/.core/skills/cypilot/scripts/cypilot/utils/manifest.py')
      );

      const { nodes, blocks } = this.convertYAMLToNodesAndBlocks(
        parsed,
        lineMap,
        [],
        changeMap,
        lineChangeTypes,
        contentToLineMap
      );

      return {
        ast: { type: 'yaml', nodes },
        blocks,
        metadata: {
          language: 'yaml',
          lineCount: lines.length,
          changeMap,
          lineChangeTypes,
        },
      };
    } catch (error) {
      console.error('YAML parsing error:', error);
      // Fallback to line-based blocks
      const lines = content.split('\n');
      const blocks: BlockMap[] = lines.map((_, index) => ({
        blockId: `yaml-line-${index + 1}`,
        rawLines: [index + 1],
        type: 'yaml_line',
        metadata: {},
      }));

      return {
        ast: { type: 'yaml', nodes: [] },
        blocks,
        metadata: { language: 'yaml', lineCount: lines.length },
      };
    }
  }

  render(
    parseResult: ParseResult,
    enrichments: any[], // Using any to avoid conflicts with old Enrichment types
    options: RenderOptions
  ): React.ReactNode {
    console.log('YAMLFormatRenderer.render - enrichments:', enrichments);
    console.log(
      'YAMLFormatRenderer.render - enrichment types:',
      enrichments.map(e => e.type)
    );
    console.log('YAMLFormatRenderer.render - parseResult.ast.nodes:', parseResult.ast.nodes);

    // Extract deleted nodes from changeMap
    const changeMap = parseResult.metadata?.changeMap as Map<string, NodeChange> | undefined;
    const deletedNodes = changeMap
      ? Array.from(changeMap.entries())
          .filter(([, change]) => change.changeType === 'deleted')
          .map(([path, change]) => ({ path, oldValue: change.oldValue }))
      : [];

    console.log('YAMLFormatRenderer.render - deletedNodes:', deletedNodes);

    // Separate comments and diffs
    const fileComments: any[] = [];
    const diffLines = new Set<number>();

    enrichments.forEach(enrichment => {
      // Skip enrichments without line range info
      if (!enrichment.lineRange) {
        return;
      }
      console.log(
        `Processing enrichment type=${enrichment.type}, lines ${enrichment.lineRange.start}-${enrichment.lineRange.end}`
      );

      for (let line = enrichment.lineRange.start; line <= enrichment.lineRange.end; line++) {
        if (enrichment.type === 'comment') {
          fileComments.push({
            id: enrichment.id,
            computed_line_number: line,
            comment_text: enrichment.data.text,
            status: enrichment.data.resolved ? 'resolved' : 'open',
            user: {
              email: enrichment.createdBy,
            },
          });
        } else if (enrichment.type === 'diff') {
          console.log(`Adding diff line: ${line}`);
          diffLines.add(line);
        }
      }
    });

    console.log('YAMLFormatRenderer.render - fileComments:', fileComments);
    console.log('YAMLFormatRenderer.render - diffLines:', diffLines);
    console.log('YAMLFormatRenderer.render - diffLines size:', diffLines.size);

    // Get PR data from options
    const prDiffData = options.prDiffData;
    const prNumber = prDiffData?.pr?.number;
    const prTitle = prDiffData?.pr?.title;

    return (
      <div className="p-6">
        {deletedNodes.length > 0 && (
          <div
            style={{
              backgroundColor: '#ffeef0',
              border: '1px solid #d73a49',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#d73a49' }}>
              🗑️ Deleted in this PR ({deletedNodes.length}{' '}
              {deletedNodes.length === 1 ? 'item' : 'items'}):
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              {deletedNodes.map((node, idx) => (
                <li key={idx} style={{ marginBottom: '4px', color: '#586069' }}>
                  <code
                    style={{ backgroundColor: '#fff5f5', padding: '2px 4px', borderRadius: '3px' }}
                  >
                    {node.path}
                  </code>
                  {typeof node.oldValue === 'string' && (
                    <span style={{ marginLeft: '8px', color: '#6a737d' }}>= "{node.oldValue}"</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <YAMLTreeView
          nodes={parseResult.ast.nodes}
          fileComments={fileComments}
          diffLines={diffLines}
          prNumber={prNumber}
          prTitle={prTitle}
          onLineClick={line => {
            console.log('YAMLTreeView - line clicked:', line);
            if (options.onLineClick) {
              options.onLineClick(line);
            }
          }}
        />
      </div>
    );
  }

  private buildYAMLLineMap(lines: string[]): Map<string, { line: number; indent: number }> {
    const map = new Map<string, { line: number; indent: number }>();
    const pathStack: Array<{ key: string; indent: number; isArray?: boolean }> = [];
    const arrayCounters = new Map<string, number>();

    console.log('buildYAMLLineMap - processing', lines.length, 'lines');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const indent = line.length - line.trimStart().length;
      const lineNum = index + 1;

      while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indent) {
        pathStack.pop();
      }

      if (trimmed.startsWith('-')) {
        const parentPath = pathStack.map(p => p.key).join('.');
        const counterKey = parentPath || 'root';
        const itemIndex = arrayCounters.get(counterKey) || 0;
        arrayCounters.set(counterKey, itemIndex + 1);

        const path = parentPath ? `${parentPath}[${itemIndex}]` : `[${itemIndex}]`;
        map.set(path, { line: lineNum, indent });

        const inlineKeyMatch = trimmed
          .substring(1)
          .trim()
          .match(/^([^:]+):/);
        if (inlineKeyMatch) {
          const key = inlineKeyMatch[1].trim();
          // For inline keys, push the array index first, then the key separately
          pathStack.push({ key: `[${itemIndex}]`, indent, isArray: true });
          map.set(`${path}.${key}`, { line: lineNum, indent });
        } else {
          pathStack.push({ key: `[${itemIndex}]`, indent, isArray: true });
        }
      } else {
        const keyMatch = trimmed.match(/^([^:]+):/);
        if (keyMatch) {
          const key = keyMatch[1].trim();
          const path = [...pathStack.map(p => p.key), key].join('.').replace(/\.\[/g, '[');
          map.set(path, { line: lineNum, indent });
          pathStack.push({ key, indent });
          arrayCounters.set(path, 0);
        }
      }
    });

    const mappings = Array.from(map.entries());
    console.log('buildYAMLLineMap - created mappings:', mappings);
    const line17 = mappings.find(([, info]) => info.line === 17);
    console.log('buildYAMLLineMap - line 17 mapping:', line17);
    return map;
  }

  private convertYAMLToNodesAndBlocks(
    obj: any,
    lineMap: Map<string, { line: number; indent: number }>,
    path: string[],
    changeMap?: Map<string, NodeChange>,
    lineChangeTypes?: Map<number, 'add' | 'delete' | 'context'>,
    contentToLineMap?: Map<string, number[]>
  ): { nodes: UnifiedNode[]; blocks: BlockMap[] } {
    const nodes: UnifiedNode[] = [];
    const blocks: BlockMap[] = [];

    if (obj === null || obj === undefined) {
      return { nodes, blocks };
    }

    // Add ghost nodes for deleted items at this level
    if (changeMap) {
      const currentPath = path.join('.');
      changeMap.forEach((change, changePath) => {
        if (change.changeType === 'deleted') {
          // Check if this deleted item belongs to the current level
          const changePathParts = changePath.split('.');
          const parentPath = changePathParts.slice(0, -1).join('.');

          if (parentPath === currentPath || (currentPath === '' && changePathParts.length === 1)) {
            const key = changePathParts[changePathParts.length - 1];
            const lineInfo = { line: 1, indent: path.length * 20 };

            nodes.push({
              type: 'yaml_mapping',
              value: typeof change.oldValue === 'string' ? change.oldValue : undefined,
              children: undefined,
              position: {
                start: { line: lineInfo.line, column: lineInfo.indent + 1, offset: 0 },
                end: { line: lineInfo.line, column: 100, offset: 0 },
              },
              data: {
                blockId: `yaml-deleted-${changePath}`,
                key: key.replace(/\[\d+\]$/, ''), // Remove array index if present
                path: [...path, key],
                indent: lineInfo.indent,
                changeType: 'deleted',
                isGhost: true,
              },
            });
          }
        }
      });
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = [...path, `[${index}]`];
        const pathKey = itemPath.join('.').replace(/\.\[/g, '[');

        // Try both formats: with and without dot before bracket
        let lineInfo = lineMap.get(pathKey);
        if (!lineInfo) {
          const altPathKey = itemPath.join('.');
          lineInfo = lineMap.get(altPathKey);
        }

        // For simple array items (strings), try to find line number by content
        if ((!lineInfo || lineInfo.line === 1) && typeof item === 'string' && contentToLineMap) {
          const possibleLines = contentToLineMap.get(item);
          if (possibleLines && possibleLines.length > index) {
            // Use the Nth occurrence of this content (where N = index)
            lineInfo = { line: possibleLines[index], indent: 0 };
            if (pathKey.includes('exclude[2].paths')) {
              console.log(
                `Array item ${index}: Matched by content "${item.substring(0, 50)}..." to line ${possibleLines[index]}`
              );
            }
          }
        }

        // Set default fallback if still no lineInfo
        if (!lineInfo) {
          lineInfo = { line: 1, indent: 0 };
        }

        if (pathKey.includes('exclude[2].paths')) {
          console.log(`Array item ${index}: pathKey="${pathKey}", final lineInfo:`, lineInfo);
          if (typeof item === 'string') {
            console.log('  Content matches:', contentToLineMap?.get(item));
          }
        }

        console.log(
          `convertYAMLToNodes - array item ${index}, pathKey: "${pathKey}", lineInfo:`,
          lineInfo
        );

        const childResult =
          typeof item === 'object' && item !== null
            ? this.convertYAMLToNodesAndBlocks(
                item,
                lineMap,
                itemPath,
                changeMap,
                lineChangeTypes,
                contentToLineMap
              )
            : { nodes: [], blocks: [] };

        // Get change type for this node - prefer line-based over structural
        const lineChangeType = lineChangeTypes?.get(lineInfo.line);
        const change = changeMap?.get(pathKey);
        const changeType =
          lineChangeType === 'add'
            ? 'added'
            : lineChangeType === 'delete'
              ? 'deleted'
              : change?.changeType;

        if (lineInfo.line >= 24 && lineInfo.line <= 27) {
          console.log(
            `Array item ${index}: pathKey="${pathKey}", line=${lineInfo.line}, lineChangeType="${lineChangeType}", finalChangeType="${changeType}"`
          );
        }

        if (changeMap && changeMap.size > 0 && index === 0) {
          console.log(
            `Array item: Looking up changeType for pathKey="${pathKey}", lineChangeType="${lineChangeType}", structuralChange:`,
            change
          );
          console.log('First 5 keys in changeMap:', Array.from(changeMap.keys()).slice(0, 5));
        }

        nodes.push({
          type: 'yaml_array_item',
          value: typeof item === 'object' || item === null ? undefined : String(item),
          children: childResult.nodes.length > 0 ? childResult.nodes : undefined,
          position: {
            start: { line: lineInfo.line, column: lineInfo.indent + 1, offset: 0 },
            end: { line: lineInfo.line, column: 100, offset: 0 },
          },
          data: {
            blockId: `yaml-${pathKey}`,
            path: itemPath,
            indent: lineInfo.indent,
            changeType,
          },
        });

        blocks.push({
          blockId: `yaml-${pathKey}`,
          rawLines: [lineInfo.line],
          type: 'yaml_array_item',
          metadata: { path: itemPath, indent: lineInfo.indent },
        });

        blocks.push(...childResult.blocks);
      });
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        const itemPath = [...path, key];
        const pathKey = itemPath.join('.').replace(/\.\[/g, '[');

        // Try both formats
        let lineInfo = lineMap.get(pathKey);
        if (!lineInfo) {
          const altPathKey = itemPath.join('.');
          lineInfo = lineMap.get(altPathKey);
        }
        if (!lineInfo) {
          lineInfo = { line: 1, indent: 0 };
        }

        console.log(
          `convertYAMLToNodes - mapping "${key}", pathKey: "${pathKey}", lineInfo:`,
          lineInfo
        );

        const childResult = this.convertYAMLToNodesAndBlocks(
          value,
          lineMap,
          itemPath,
          changeMap,
          lineChangeTypes,
          contentToLineMap
        );

        // Get change type for this node - prefer line-based over structural
        const lineChangeType = lineChangeTypes?.get(lineInfo.line);
        const change = changeMap?.get(pathKey);
        const changeType =
          lineChangeType === 'add'
            ? 'added'
            : lineChangeType === 'delete'
              ? 'deleted'
              : change?.changeType;

        if (changeMap && changeMap.size > 0) {
          console.log(
            `Mapping: Looking up changeType for pathKey="${pathKey}", lineChangeType="${lineChangeType}", structuralChange:`,
            change
          );
          if (!change) {
            console.log('Available keys in changeMap:', Array.from(changeMap.keys()));
          }
        }

        nodes.push({
          type: 'yaml_mapping',
          value: typeof value === 'object' || value === null ? undefined : String(value),
          children: childResult.nodes.length > 0 ? childResult.nodes : undefined,
          position: {
            start: { line: lineInfo.line, column: lineInfo.indent + 1, offset: 0 },
            end: { line: lineInfo.line, column: 100, offset: 0 },
          },
          data: {
            blockId: `yaml-${pathKey}`,
            key,
            path: itemPath,
            indent: lineInfo.indent,
            changeType,
          },
        });

        blocks.push({
          blockId: `yaml-${pathKey}`,
          rawLines: [lineInfo.line],
          type: 'yaml_mapping',
          metadata: { key, path: itemPath, indent: lineInfo.indent },
        });

        blocks.push(...childResult.blocks);
      });
    }

    return { nodes, blocks };
  }
}
