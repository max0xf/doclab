import React, { useState } from 'react';
import { FileComment } from '../../../../../services/commentsApi';

interface Editor1RendererProps {
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: any;
  onLineClick: (lineNumber: number) => void;
}

export function Editor1Renderer({
  fileContent,
  fileComments,
  prDiffData,
  onLineClick: _onLineClick,
}: Editor1RendererProps) {
  const [content, setContent] = useState(fileContent);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(e.target.value !== fileContent);
  };

  const handleSave = () => {
    console.log('Save functionality to be implemented');
    setIsDirty(false);
  };

  const handleReset = () => {
    setContent(fileContent);
    setIsDirty(false);
  };

  const hasDiffChanges = prDiffData && prDiffData.hunks && prDiffData.hunks.length > 0;

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
            Edit Mode 1: Basic Text Editor
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
                Save Changes
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
            Editing may conflict with the PR. Consider reviewing changes in Plain Text mode first.
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
        />
      </div>

      <div
        className="border-t px-4 py-2"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Lines: {content.split('\n').length} | Characters: {content.length}
          {isDirty && ' | Unsaved changes'}
        </p>
      </div>
    </div>
  );
}
