import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, Content } from 'mdast';
import type { FormatRenderer, ParseResult, RenderOptions } from './FormatRenderer';
import type { ContentTypeInfo } from '../utils/contentTypeDetector';
import { Enrichment, BlockMap } from '../enrichments/types';
import { MarkdownTreeView } from '../components/MarkdownTreeView';
import { PRDiffData } from '../types/prDiff';
import { UnifiedNode } from '../utils/contentParser';

export class MarkdownFormatRenderer implements FormatRenderer {
  name = 'markdown';
  supportedTypes: ContentTypeInfo['type'][] = ['markdown'];
  supportedEnrichments: Enrichment['type'][] = ['comment', 'diff', 'annotation', 'highlight'];

  canHandle(contentType: ContentTypeInfo): boolean {
    const canHandle = contentType.type === 'markdown';
    console.log('MarkdownFormatRenderer.canHandle:', { contentType, canHandle });
    return canHandle;
  }

  parse(
    content: string,
    _contentType: ContentTypeInfo,
    prDiffData?: PRDiffData | null
  ): ParseResult {
    try {
      // Build ephemeral content by inserting deleted lines from PR diff
      let ephemeralContent = content;
      const lineChangeTypes = new Map<number, 'add' | 'delete' | 'context'>();

      if (prDiffData && prDiffData.hunks && prDiffData.hunks.length > 0) {
        console.log(
          'MarkdownFormatRenderer - Building ephemeral Markdown content with deleted lines...'
        );

        const currentLines = content.split('\n');
        const ephemeralLines: string[] = [];
        let currentLineIndex = 0;
        let ephemeralLineNumber = 0;

        prDiffData.hunks.forEach((hunk: any) => {
          const hunkNewStart = hunk.new_start || hunk.newStart;

          // Add lines before this hunk
          while (currentLineIndex < hunkNewStart - 1 && currentLineIndex < currentLines.length) {
            ephemeralLineNumber++;
            ephemeralLines.push(currentLines[currentLineIndex]);
            lineChangeTypes.set(ephemeralLineNumber, 'context');
            currentLineIndex++;
          }

          // Process hunk lines
          const lines = hunk.lines || [];
          lines.forEach((line: any) => {
            ephemeralLineNumber++;
            if (line.type === 'delete') {
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'delete');
            } else if (line.type === 'add') {
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'add');
              currentLineIndex++;
            } else {
              ephemeralLines.push(line.content);
              lineChangeTypes.set(ephemeralLineNumber, 'context');
              currentLineIndex++;
            }
          });
        });

        // Add remaining lines
        while (currentLineIndex < currentLines.length) {
          ephemeralLineNumber++;
          ephemeralLines.push(currentLines[currentLineIndex]);
          lineChangeTypes.set(ephemeralLineNumber, 'context');
          currentLineIndex++;
        }

        ephemeralContent = ephemeralLines.join('\n');
        console.log(
          'MarkdownFormatRenderer - Ephemeral content built:',
          ephemeralContent.length,
          'chars'
        );
        console.log(
          'MarkdownFormatRenderer - Line change types:',
          Array.from(lineChangeTypes.entries()).slice(0, 20)
        );
      }

      // Parse the ephemeral content with remark
      const processor = unified().use(remarkParse).use(remarkGfm);

      const ast = processor.parse(ephemeralContent) as Root;
      const lines = ephemeralContent.split('\n');

      // Convert MDAST to UnifiedNode format with line positions
      const nodes = this.convertMDASTToNodes(ast, lines, lineChangeTypes);

      // Create blocks for each line
      const blocks: BlockMap[] = lines.map((_, index) => ({
        blockId: `markdown-line-${index + 1}`,
        rawLines: [index + 1],
        type: 'markdown_line',
        metadata: {},
      }));

      return {
        ast: { type: 'markdown', nodes },
        blocks,
        metadata: {
          language: 'markdown',
          lineCount: lines.length,
          lineChangeTypes,
        },
      };
    } catch (error) {
      console.error('MarkdownFormatRenderer - Parse error:', error);
      const lines = content.split('\n');
      const blocks: BlockMap[] = lines.map((_, index) => ({
        blockId: `markdown-line-${index + 1}`,
        rawLines: [index + 1],
        type: 'markdown_line',
        metadata: {},
      }));

      return {
        ast: { type: 'markdown', nodes: [] },
        blocks,
        metadata: { language: 'markdown', lineCount: lines.length },
      };
    }
  }

  private convertMDASTToNodes(
    ast: Root,
    lines: string[],
    lineChangeTypes?: Map<number, 'add' | 'delete' | 'context'>
  ): UnifiedNode[] {
    const nodes: UnifiedNode[] = [];

    ast.children.forEach((node: Content) => {
      const unifiedNode = this.convertMDASTNode(node, lines, lineChangeTypes);
      if (unifiedNode) {
        nodes.push(unifiedNode);
      }
    });

    return nodes;
  }

  private convertMDASTNode(
    node: Content,
    lines: string[],
    lineChangeTypes?: Map<number, 'add' | 'delete' | 'context'>
  ): UnifiedNode | null {
    if (!node.position) {
      return null;
    }

    // Skip text nodes - they'll be extracted as values from parent nodes
    if (node.type === 'text' || node.type === 'inlineCode') {
      return null;
    }

    const startLine = node.position.start.line;
    const endLine = node.position.end.line;

    // Determine change type based on line changes
    let changeType: 'added' | 'deleted' | 'modified' | undefined;
    const lineTypes = new Set<string>();
    for (let line = startLine; line <= endLine; line++) {
      const type = lineChangeTypes?.get(line);
      if (type) {
        lineTypes.add(type);
      }
    }

    if (lineTypes.has('add') && !lineTypes.has('delete')) {
      changeType = 'added';
    } else if (lineTypes.has('delete') && !lineTypes.has('add')) {
      changeType = 'deleted';
    } else if (lineTypes.has('add') && lineTypes.has('delete')) {
      changeType = 'modified';
    }

    // Extract text content from this node and its children
    const value = this.extractText(node);

    const unifiedNode: UnifiedNode = {
      type: `markdown_${node.type}`,
      position: {
        start: {
          line: node.position.start.line,
          column: node.position.start.column,
          offset: node.position.start.offset || 0,
        },
        end: {
          line: node.position.end.line,
          column: node.position.end.column,
          offset: node.position.end.offset || 0,
        },
      },
      value,
      data: {
        nodeType: node.type,
        changeType,
        ...(node.type === 'heading' && 'depth' in node ? { depth: node.depth } : {}),
        ...(node.type === 'list' && 'ordered' in node ? { ordered: node.ordered } : {}),
      },
    };

    // For structural nodes like lists, convert children
    if (node.type === 'list' && 'children' in node && Array.isArray(node.children)) {
      unifiedNode.children = node.children
        .map(child => this.convertMDASTNode(child as Content, lines, lineChangeTypes))
        .filter((n): n is UnifiedNode => n !== null);
    }

    return unifiedNode;
  }

  private extractText(node: any): string {
    if (typeof node.value === 'string') {
      return node.value;
    }
    if (Array.isArray(node.children)) {
      return node.children.map((child: any) => this.extractText(child)).join('');
    }
    return '';
  }

  render(
    parseResult: ParseResult,
    enrichments: any[], // Using any to avoid conflicts with old Enrichment types
    options: RenderOptions
  ): React.ReactNode {
    console.log('MarkdownFormatRenderer.render - enrichments:', enrichments);
    console.log('MarkdownFormatRenderer.render - parseResult.ast.nodes:', parseResult.ast.nodes);

    // Separate comments and diffs
    const fileComments: any[] = [];
    const diffLines = new Set<number>();

    enrichments.forEach(enrichment => {
      // Skip enrichments without line range info
      if (!enrichment.lineRange) {
        return;
      }
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
          diffLines.add(line);
        }
      }
    });

    // Get PR data from options
    const prDiffData = options.prDiffData;
    const prNumber = prDiffData?.pr?.number;
    const prTitle = prDiffData?.pr?.title;

    return (
      <div className="p-6">
        <MarkdownTreeView
          nodes={parseResult.ast.nodes}
          fileComments={fileComments}
          diffLines={diffLines}
          prNumber={prNumber}
          prTitle={prTitle}
          onLineClick={line => {
            console.log('MarkdownTreeView - line clicked:', line);
            if (options.onLineClick) {
              options.onLineClick(line);
            }
          }}
        />
      </div>
    );
  }
}
