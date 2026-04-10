import React, { useState } from 'react';
import { Save, X, Edit2 } from 'lucide-react';
import { EnrichedContentRenderer } from '../renderers/EnrichedContentRenderer';
import { FileComment } from '../../../../../services/commentsApi';
import { PRDiffData } from '../types/prDiff';

interface VisualEditorProps {
  filename: string;
  content: string;
  onChange: (content: string) => void;
  fileComments: FileComment[];
  prDiffData: PRDiffData | null;
  onLineClick: (lineNumber: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function VisualEditor({
  filename,
  content,
  onChange,
  fileComments,
  prDiffData,
  onLineClick,
  onSave,
  onCancel,
}: VisualEditorProps) {
  const [editMode, setEditMode] = useState<'visual' | 'source'>('visual');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Editor toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Visual Editing
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditMode('visual')}
              className="px-2 py-1 text-xs rounded"
              style={{
                backgroundColor: editMode === 'visual' ? 'var(--primary)' : 'transparent',
                color: editMode === 'visual' ? 'white' : 'var(--text-primary)',
              }}
            >
              Visual
            </button>
            <button
              onClick={() => setEditMode('source')}
              className="px-2 py-1 text-xs rounded"
              style={{
                backgroundColor: editMode === 'source' ? 'var(--primary)' : 'transparent',
                color: editMode === 'source' ? 'white' : 'var(--text-primary)',
              }}
            >
              Source
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#28a745',
              color: 'white',
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        {editMode === 'visual' ? (
          <div className="relative">
            {/* Overlay edit indicators on rendered content */}
            <div className="absolute top-2 right-2 z-10">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  border: '1px solid #1976d2',
                  color: '#1976d2',
                }}
              >
                <Edit2 size={12} />
                Click elements to edit
              </div>
            </div>
            <EnrichedContentRenderer
              filename={filename}
              fileContent={content}
              fileComments={fileComments}
              enrichments={
                prDiffData
                  ? [{ type: 'pr-diff', category: 'diff', data: prDiffData, priority: 1 }]
                  : []
              }
              onLineClick={onLineClick}
            />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => onChange(e.target.value)}
            className="w-full h-full p-4 resize-none focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: '1.5',
            }}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
