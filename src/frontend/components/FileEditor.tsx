import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Save, X, AlertCircle } from 'lucide-react';
import TiptapEditor from './TiptapEditor';

interface FileEditorProps {
  fileName: string;
  content: string;
  language?: string;
  onSave: (newContent: string, description: string) => Promise<void>;
  onCancel: () => void;
}

export default function FileEditor({
  fileName,
  content,
  language,
  onSave,
  onCancel,
}: FileEditorProps) {
  const [editorContent, setEditorContent] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');
  const editorRef = useRef<any>(null);

  // Auto-save to localStorage
  useEffect(() => {
    if (isDirty) {
      const draftKey = `draft:${fileName}`;
      localStorage.setItem(draftKey, editorContent);
      localStorage.setItem(`${draftKey}:timestamp`, new Date().toISOString());
    }
  }, [editorContent, fileName, isDirty]);

  // Load draft on mount
  useEffect(() => {
    const draftKey = `draft:${fileName}`;
    const draft = localStorage.getItem(draftKey);
    const timestamp = localStorage.getItem(`${draftKey}:timestamp`);

    if (draft && draft !== content && timestamp) {
      const draftTime = new Date(timestamp);
      const timeDiff = Date.now() - draftTime.getTime();

      // Only restore drafts less than 24 hours old
      if (timeDiff < 24 * 60 * 60 * 1000) {
        if (window.confirm(`Found a draft from ${draftTime.toLocaleString()}. Restore it?`)) {
          setEditorContent(draft);
          setIsDirty(true);
        }
      }
    }
  }, [fileName, content]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditorContent(value);
      setIsDirty(value !== content);
    }
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async () => {
    if (!saveDescription.trim()) {
      alert('Please provide a description for your changes');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editorContent, saveDescription);

      // Clear draft after successful save
      const draftKey = `draft:${fileName}`;
      localStorage.removeItem(draftKey);
      localStorage.removeItem(`${draftKey}:timestamp`);

      setIsDirty(false);
      setShowSaveDialog(false);
      setSaveDescription('');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const isMarkdownFile = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown';
  };

  const detectLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
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
      sh: 'shell',
      bash: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      sql: 'sql',
    };
    return ext ? languageMap[ext] || 'plaintext' : 'plaintext';
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Editing: {fileName}
          </span>
          {isDirty && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: '#fff3cd',
                color: '#856404',
              }}
            >
              <AlertCircle size={12} />
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
            }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Editor - Tiptap for Markdown, Monaco for Code */}
      <div
        className="flex-1"
        style={{
          minHeight: 0,
          backgroundColor: '#ffffff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMarkdownFile(fileName) ? (
          /* Tiptap Editor for Markdown */
          <TiptapEditor
            content={editorContent}
            onChange={handleEditorChange}
            placeholder={`Edit ${fileName}...`}
          />
        ) : (
          /* Monaco Editor for Code */
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              width="100%"
              language={language || detectLanguage(fileName)}
              value={editorContent}
              onChange={handleEditorChange}
              theme="vs-light"
              loading={
                <div
                  className="flex items-center justify-center"
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '100%',
                    width: '100%',
                  }}
                >
                  Loading editor...
                </div>
              }
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                rulers: [80, 120],
                wordWrap: 'off',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                readOnly: false,
              }}
              onMount={editor => {
                editorRef.current = editor;
                console.log('[FileEditor] Monaco editor mounted', {
                  fileName,
                  contentLength: editorContent.length,
                  editorHeight: editor.getLayoutInfo().height,
                });
                // Force layout after mount
                setTimeout(() => {
                  editor.layout();
                }, 100);
              }}
              onValidate={markers => {
                console.log('[FileEditor] Validation markers:', markers);
              }}
            />
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="rounded-lg shadow-xl max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Save Changes
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Describe your changes. This will be submitted for approval.
              </p>
              <textarea
                value={saveDescription}
                onChange={e => setSaveDescription(e.target.value)}
                placeholder="e.g., Fixed typo in documentation, Updated API endpoint, etc."
                className="w-full px-3 py-2 border rounded-lg resize-none"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                rows={4}
                autoFocus
              />
            </div>
            <div
              className="px-6 py-4 border-t flex justify-end gap-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={isSaving || !saveDescription.trim()}
                className="px-4 py-2 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#0066cc',
                  color: 'white',
                }}
              >
                {isSaving ? 'Saving...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
