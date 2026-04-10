/**
 * Code Format Renderer
 *
 * Renders code files with enrichments using Expressive Code
 */

import React from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeExpressiveCode from 'rehype-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { FormatRenderer, ParseResult, RenderOptions } from './FormatRenderer';
import { ContentTypeInfo } from '../utils/contentTypeDetector';
import { Enrichment, BlockMap } from '../enrichments/types';
import { EnrichmentMapper } from '../enrichments/EnrichmentMapper';

export class CodeFormatRenderer implements FormatRenderer {
  name = 'code';
  supportedTypes: ContentTypeInfo['type'][] = ['code'];
  supportedEnrichments: Enrichment['type'][] = ['comment', 'diff', 'annotation', 'highlight'];

  canHandle(contentType: ContentTypeInfo): boolean {
    return contentType.type === 'code' && contentType.language !== 'yaml';
  }

  parse(content: string, contentType: ContentTypeInfo): ParseResult {
    const lines = content.split('\n');

    // For code, each line is a block
    const blocks: BlockMap[] = lines.map((_, index) => ({
      blockId: `code-line-${index + 1}`,
      rawLines: [index + 1],
      renderedLines: [index + 1],
      type: 'code_line',
      metadata: {
        language: contentType.language,
      },
    }));

    // Add a single block for the entire file
    blocks.unshift({
      blockId: 'code-file',
      rawLines: lines.map((_, i) => i + 1),
      renderedLines: lines.map((_, i) => i + 1),
      type: 'code_file',
      metadata: {
        language: contentType.language,
      },
    });

    return {
      ast: { type: 'code', content, language: contentType.language },
      blocks,
      metadata: {
        language: contentType.language,
        lineCount: lines.length,
      },
    };
  }

  render(
    parseResult: ParseResult,
    enrichments: Enrichment[],
    options: RenderOptions
  ): React.ReactNode {
    const { ast } = parseResult;
    const mapper = new EnrichmentMapper(parseResult.blocks);

    // Group enrichments by line
    const commentsByLine = mapper.groupByLine(mapper.filterByType(enrichments, 'comment'));
    const diffsByLine = mapper.groupByLine(mapper.filterByType(enrichments, 'diff'));

    return (
      <CodeRenderer
        content={ast.content}
        language={ast.language}
        commentsByLine={commentsByLine}
        diffsByLine={diffsByLine}
        options={options}
      />
    );
  }
}

interface CodeRendererProps {
  content: string;
  language: string;
  commentsByLine: Map<number, Enrichment[]>;
  diffsByLine: Map<number, Enrichment[]>;
  options: RenderOptions;
}

function CodeRenderer({
  content,
  language,
  commentsByLine,
  diffsByLine,
  options,
}: CodeRendererProps) {
  const [processedHtml, setProcessedHtml] = React.useState<string>('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const processCode = async () => {
      setIsProcessing(true);
      try {
        const codeBlock = `\`\`\`${language}\n${content}\n\`\`\``;

        // Build text markers for diffs
        const addedLines: number[] = [];
        const deletedLines: number[] = [];
        const modifiedLines: number[] = [];

        diffsByLine.forEach((diffs, lineNum) => {
          diffs.forEach(diff => {
            if (diff.type === 'diff') {
              switch (diff.data.changeType) {
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
            }
          });
        });

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

        const metaString = markers.join(' ');
        const codeWithMeta = metaString
          ? `\`\`\`${language} ${metaString}\n${content}\n\`\`\``
          : codeBlock;

        const processor = unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeExpressiveCode, {
            themes: ['github-light', 'github-dark'],
            plugins: [pluginLineNumbers()],
            defaultProps: {
              showLineNumbers: options.showLineNumbers !== false,
            },
          })
          .use(rehypeStringify);

        const result = await processor.process(codeWithMeta);
        setProcessedHtml(String(result));
      } catch (error) {
        console.error('Code processing error:', error);
        setProcessedHtml('');
      } finally {
        setIsProcessing(false);
      }
    };

    processCode();
  }, [content, language, diffsByLine, options.showLineNumbers]);

  if (isProcessing) {
    return <div className="p-6 text-center">Processing code...</div>;
  }

  return (
    <div className="relative">
      {/* Expressive Code output */}
      {processedHtml && (
        <div
          className="expressive-code-container"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      )}

      {/* Comment indicators overlay */}
      {Array.from(commentsByLine.entries()).map(([lineNum, comments]) => (
        <div
          key={`comment-${lineNum}`}
          style={{
            position: 'absolute',
            right: '20px',
            top: `${lineNum * 24 + 60}px`,
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={() => options.onEnrichmentClick?.(comments[0])}
        >
          <div
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
            title={`${comments.length} comment${comments.length > 1 ? 's' : ''}`}
          >
            💬 {comments.length}
          </div>
        </div>
      ))}

      {/* Custom styles for diff markers */}
      <style>{`
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
      `}</style>
    </div>
  );
}
