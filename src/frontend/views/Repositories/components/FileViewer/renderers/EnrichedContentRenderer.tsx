import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatRendererRegistry } from './FormatRenderer';
import type { FileComment } from '../../../../../services/commentsApi';
import { detectContentType } from '../utils/contentTypeDetector';
import { CodeFormatRenderer } from './CodeFormatRenderer';
import { YAMLFormatRenderer } from './YAMLFormatRenderer';
import { MarkdownFormatRenderer } from './MarkdownFormatRenderer';

interface EnrichedContentRendererProps {
  filename: string;
  fileContent: string;
  fileComments: FileComment[];
  enrichments: any[];
  onLineClick: (lineNumber: number) => void;
}

// Register format renderers
formatRendererRegistry.register(new CodeFormatRenderer());
formatRendererRegistry.register(new YAMLFormatRenderer());
formatRendererRegistry.register(new MarkdownFormatRenderer());

export function EnrichedContentRenderer({
  fileContent,
  filename,
  fileComments: _fileComments,
  enrichments,
  onLineClick,
}: EnrichedContentRendererProps) {
  // Stage 1: Detect content type
  const contentType = useMemo(() => {
    const detected = detectContentType(filename, fileContent);
    console.log('EnrichedContentRenderer - Content type detected:', {
      filename,
      detected,
      contentPreview: fileContent.substring(0, 100),
    });
    return detected;
  }, [filename, fileContent]);

  // Stage 2: Get format renderer
  const renderer = useMemo(() => {
    const selectedRenderer = formatRendererRegistry.getRenderer(contentType);
    console.log('EnrichedContentRenderer - Selected renderer:', {
      contentType,
      rendererName: selectedRenderer?.name,
      allRenderers: formatRendererRegistry.getAllRenderers().map(r => r.name),
    });
    return selectedRenderer;
  }, [contentType]);

  // Stage 3: Parse content
  const parseResult = useMemo(() => {
    if (!renderer) {
      return null;
    }
    const prDiffData = enrichments.find(e => e.category === 'diff')?.data || null;
    return renderer.parse(fileContent, contentType, prDiffData);
  }, [renderer, fileContent, contentType, enrichments]);

  // Enrichments are already in unified format from props

  // No longer needed - handled by format renderers

  // Render using format renderer or fallback
  const renderContent = () => {
    console.log('EnrichedContentRenderer - Rendering content type:', contentType.type);

    // Use format renderer if available
    if (renderer && parseResult) {
      return renderer.render(parseResult, enrichments, {
        showLineNumbers: true,
        enableInteractions: true,
        onLineClick,
        onEnrichmentClick: (enrichment: any) => {
          console.log('Enrichment clicked:', enrichment);
          if (enrichment.lineRange?.start) {
            onLineClick(enrichment.lineRange.start);
          }
        },
      });
    }

    // Fallback to old rendering for unsupported formats
    switch (contentType.type) {
      case 'markdown':
        return renderMarkdown();
      case 'plaintext':
        return renderPlainText();
      default:
        return renderPlainText();
    }
  };

  // Render Markdown content - ReactMarkdown handles AST to HTML conversion internally
  const renderMarkdown = () => {
    return (
      <div className="p-6">
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div
            className="prose prose-sm max-w-none"
            style={{
              color: 'var(--text-primary)',
              lineHeight: '1.7',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  // Removed - now handled by CodeFormatRenderer

  // Render plain text content
  const renderPlainText = () => {
    return (
      <div className="enriched-plaintext">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{fileContent}</pre>
      </div>
    );
  };

  // Removed - now handled by YAMLFormatRenderer

  return (
    <div className="p-6">
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div
          className="prose prose-sm max-w-none"
          style={{
            color: 'var(--text-primary)',
            lineHeight: '1.7',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
