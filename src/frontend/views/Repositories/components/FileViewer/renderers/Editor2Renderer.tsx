import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileComment } from '../../../../../services/commentsApi';

interface Editor2RendererProps {
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: any;
  onLineClick: (lineNumber: number) => void;
}

export function Editor2Renderer({
  fileContent,
  fileComments,
  prDiffData,
  onLineClick: _onLineClick,
}: Editor2RendererProps) {
  const [content, setContent] = useState(fileContent);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(e.target.value !== fileContent);
  };

  const handleSave = () => {
    console.log('Save functionality to be implemented (TinaCMS-style)');
    setIsDirty(false);
  };

  const handleReset = () => {
    setContent(fileContent);
    setIsDirty(false);
  };

  const hasDiffChanges = prDiffData && prDiffData.hunks && prDiffData.hunks.length > 0;
  const isMarkdown =
    fileContent.includes('# ') || fileContent.includes('## ') || fileContent.includes('```');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="border-b px-4 py-2 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Edit Mode 2: TinaCMS-Style WYSIWYG Editor
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
        <div className="flex items-center gap-2">
          {isMarkdown && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1.5 text-sm rounded transition-all"
              style={{
                backgroundColor: showPreview ? 'var(--primary)' : 'var(--bg-primary)',
                color: showPreview ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          )}
          {isDirty && (
            <>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm rounded transition-all"
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
                className="px-3 py-1.5 text-sm rounded transition-all"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                }}
              >
                Save to Git
              </button>
            </>
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
          <p className="text-sm font-medium">
            ⚠️ Warning: This file has pending PR changes (PR #{prDiffData.pr?.number})
          </p>
          <p className="text-xs mt-1">
            TinaCMS-style editing with Git-backed persistence. Changes will create a new commit.
          </p>
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
            💬 {fileComments.length} comment{fileComments.length > 1 ? 's' : ''} on this file
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {showPreview && isMarkdown ? (
          <div
            className="prose prose-sm max-w-none p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full">
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
              placeholder="Start typing... (TinaCMS-style Git-backed editor)"
            />
          </div>
        )}
      </div>

      <div
        className="border-t px-4 py-2"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          🔄 Git-backed | Lines: {content.split('\n').length} | Characters: {content.length}
          {isDirty && ' | Unsaved changes'}
        </p>
      </div>
    </div>
  );
}
