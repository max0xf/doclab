import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileComment } from '../../../../../services/commentsApi';

interface Editor3RendererProps {
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: any;
  onLineClick: (lineNumber: number) => void;
}

export function Editor3Renderer({
  fileContent,
  fileComments,
  prDiffData,
  onLineClick: _onLineClick,
}: Editor3RendererProps) {
  const [content, setContent] = useState(fileContent);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(e.target.value !== fileContent);
  };

  const handleSave = () => {
    console.log('Save functionality to be implemented (MDX-aware)');
    setIsDirty(false);
  };

  const handleReset = () => {
    setContent(fileContent);
    setIsDirty(false);
  };

  const hasDiffChanges = prDiffData && prDiffData.hunks && prDiffData.hunks.length > 0;
  const isMDX =
    fileContent.includes('import ') || fileContent.includes('export ') || fileContent.includes('<');

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col border-r" style={{ borderColor: 'var(--border-color)' }}>
        <div
          className="border-b px-4 py-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              MDX Editor
            </span>
            {isDirty && (
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                }}
              >
                Modified
              </span>
            )}
          </div>
        </div>

        {hasDiffChanges && (
          <div
            className="mx-4 mt-4 p-3 rounded-md border-l-4"
            style={{
              backgroundColor: '#fff3cd',
              borderColor: '#ff9800',
              color: '#856404',
            }}
          >
            <p className="text-sm font-medium">⚠️ PR #{prDiffData.pr?.number} active</p>
          </div>
        )}

        {fileComments.length > 0 && (
          <div
            className="mx-4 mt-2 p-3 rounded-md border-l-4"
            style={{
              backgroundColor: '#fff4e5',
              borderColor: '#ff9800',
              color: '#e65100',
            }}
          >
            <p className="text-sm font-medium">
              💬 {fileComments.length} comment{fileComments.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full h-full p-4 rounded-lg border resize-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: '1.5',
            }}
            spellCheck={false}
            placeholder="Write MDX with JSX components..."
          />
        </div>

        <div
          className="border-t px-4 py-2 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isMDX ? '📦 MDX detected' : '📝 Markdown'} | Lines: {content.split('\n').length}
          </p>
          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs rounded transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs rounded transition-all"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                  }}
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          className="border-b px-4 py-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Live Preview
          </span>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div
            className="prose prose-sm max-w-none"
            style={{
              color: 'var(--text-primary)',
            }}
          >
            {isMDX ? (
              <div
                className="p-4 rounded-lg border-l-4"
                style={{
                  backgroundColor: '#e3f2fd',
                  borderColor: '#1976d2',
                  color: '#1565c0',
                }}
              >
                <p className="text-sm font-medium">🚀 MDX Preview</p>
                <p className="text-xs mt-1">
                  Full MDX rendering with component support would require MDX runtime integration.
                  Showing Markdown preview for now.
                </p>
              </div>
            ) : null}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
