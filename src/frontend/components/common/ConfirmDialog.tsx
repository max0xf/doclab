import React from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
}: ConfirmDialogProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm mb-6" style={{ color: 'var(--text-primary)' }}>
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded"
            style={{
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm rounded font-medium"
            style={{
              backgroundColor: danger ? '#dc2626' : 'var(--accent-color, #1976d2)',
              color: 'white',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
