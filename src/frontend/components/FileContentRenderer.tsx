import React from 'react';
import CodeRenderer, { LineSelection } from './renderers/CodeRenderer';
import MarkdownRenderer from './renderers/MarkdownRenderer';
import PlainTextRenderer from './renderers/PlainTextRenderer';
import type { EnrichmentsResponse } from '../services/enrichmentApi';

interface FileContentRendererProps {
  fileName: string;
  content: string;
  language?: string;
  isLoading?: boolean;
  onLineSelect?: (selection: LineSelection) => void;
  selectedLines?: LineSelection | null;
  enrichments?: EnrichmentsResponse;
  onEnrichmentClick?: (enrichmentType: string, enrichmentId: string | number) => void;
}

export default function FileContentRenderer({
  fileName,
  content,
  language,
  isLoading = false,
  onLineSelect,
  selectedLines,
  enrichments,
  onEnrichmentClick,
}: FileContentRendererProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-2"></div>
          <p>Loading file content...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-secondary)' }}>No content available</p>
      </div>
    );
  }

  const fileType = detectFileType(fileName, language);

  switch (fileType) {
    case 'markdown':
      return (
        <MarkdownRenderer
          content={content}
          onLineSelect={onLineSelect}
          selectedLines={selectedLines}
          enrichments={enrichments}
          onEnrichmentClick={onEnrichmentClick}
        />
      );
    case 'code':
      return (
        <CodeRenderer
          content={content}
          language={language || detectLanguage(fileName)}
          fileName={fileName}
          onLineSelect={onLineSelect}
          selectedLines={selectedLines}
          enrichments={enrichments}
          onEnrichmentClick={onEnrichmentClick}
        />
      );
    default:
      return <PlainTextRenderer content={content} />;
  }
}

function detectFileType(fileName: string, language?: string): 'markdown' | 'code' | 'plain' {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }

  const codeExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'c',
    'cpp',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'swift',
    'kt',
    'scala',
    'sh',
    'bash',
    'zsh',
    'yaml',
    'yml',
    'json',
    'xml',
    'html',
    'css',
    'scss',
    'sass',
    'less',
    'sql',
    'r',
    'dart',
    'lua',
  ];

  if (ext && codeExtensions.includes(ext)) {
    return 'code';
  }

  if (language) {
    return 'code';
  }

  return 'plain';
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    r: 'r',
    dart: 'dart',
    lua: 'lua',
  };

  return ext ? languageMap[ext] || 'text' : 'text';
}
