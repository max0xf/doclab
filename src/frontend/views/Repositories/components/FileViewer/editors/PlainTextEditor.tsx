import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, X, RotateCcw } from 'lucide-react';
import { PlainTextRenderer } from '../renderers/PlainTextRenderer';
import { FileComment } from '../../../../../services/commentsApi';
import { PRDiffData } from '../types/prDiff';
import { saveUserChanges, discardUserChanges } from '../../../../../services/userChangesApi';

interface PlainTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  fileComments: FileComment[];
  prDiffData: PRDiffData | null;
  onLineClick: (lineNumber: number) => void;
  repository?: { fullName: string };
  filePath?: string;
  originalContent: string;
}

export function PlainTextEditor({
  content,
  onChange,
  onSave,
  onCancel,
  fileComments,
  prDiffData,
  onLineClick,
  repository,
  filePath,
  originalContent,
}: PlainTextEditorProps) {
  const [editableLines, setEditableLines] = useState<string[]>(content.split('\n'));
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editableLines with content when it changes
  useEffect(() => {
    setEditableLines(content.split('\n'));
  }, [content]);

  // Update parent content when lines change
  useEffect(() => {
    onChange(editableLines.join('\n'));
  }, [editableLines, onChange]);

  // Autosave function
  const performAutosave = useCallback(async () => {
    if (!repository?.fullName || !filePath) {
      return;
    }

    const modifiedContent = editableLines.join('\n');

    // Only save if content has changed
    if (modifiedContent === originalContent) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      console.log('Attempting to save user changes...');
      await saveUserChanges(repository.fullName, filePath, originalContent, modifiedContent);
      setLastSaved(new Date());
      console.log('Save successful!');
    } catch (error) {
      console.error('Autosave failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      console.error('Setting error state:', errorMessage);
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [editableLines, originalContent, repository, filePath]);

  // Set up autosave timer (15 seconds)
  useEffect(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    // Start new timer
    autosaveTimerRef.current = setInterval(() => {
      performAutosave();
    }, 15000); // 15 seconds

    // Cleanup on unmount
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [performAutosave]);

  // Handle discard changes
  const handleDiscard = async () => {
    if (!repository?.fullName || !filePath) {
      return;
    }

    if (
      !window.confirm('Are you sure you want to discard all your changes? This cannot be undone.')
    ) {
      return;
    }

    try {
      await discardUserChanges(repository.fullName, filePath);
      // Reset to original content
      setEditableLines(originalContent.split('\n'));
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to discard changes:', error);
      alert('Failed to discard changes. Please try again.');
    }
  };

  const handleLineEdit = (lineIndex: number, newContent: string) => {
    const newLines = [...editableLines];
    newLines[lineIndex] = newContent;
    setEditableLines(newLines);
  };

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
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Editing - Click on any line to edit
          </span>
          {isSaving && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Saving...
            </span>
          )}
          {!isSaving && saveError && (
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                color: 'white',
                backgroundColor: '#d73a49',
                fontWeight: 'bold',
              }}
            >
              ⚠️ Save failed: {saveError}
            </span>
          )}
          {!isSaving && !saveError && lastSaved && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: '#d73a49',
              border: '1px solid #d73a49',
            }}
            title="Discard all changes and reset to original"
          >
            <RotateCcw size={16} />
            Discard
          </button>
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

      {/* Inline editable renderer */}
      <div ref={editorRef} className="flex-1 overflow-auto">
        <PlainTextRenderer
          fileContent={editableLines.join('\n')}
          fileComments={fileComments}
          enrichments={
            prDiffData ? [{ type: 'pr-diff', category: 'diff', data: prDiffData, priority: 1 }] : []
          }
          onLineClick={onLineClick}
          isEditable={true}
          onLineEdit={handleLineEdit}
        />
      </div>
    </div>
  );
}
