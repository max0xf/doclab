import React, { useState } from 'react';
import { Send, Trash2, CheckCircle, MessageSquare } from 'lucide-react';
import type { CommentEnrichment } from '../services/enrichmentApi';

interface CommentProps {
  comment: CommentEnrichment;
  replies: CommentEnrichment[];
  onDelete: (commentId: number) => void;
  onResolve: (commentId: number, isResolved: boolean) => void;
  onReply: (parentId: number, text: string) => void;
  isSubmitting: boolean;
  depth?: number;
}

export function Comment({
  comment,
  replies,
  onDelete,
  onResolve,
  onReply,
  isSubmitting,
  depth = 0,
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = () => {
    if (!replyText.trim()) {
      return;
    }
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReplyForm(false);
  };

  const indentClass = depth > 0 ? 'ml-6 border-l-2 pl-3' : '';

  return (
    <div
      className={indentClass}
      style={{ borderColor: depth > 0 ? 'var(--border-color)' : undefined }}
    >
      <div className="p-3" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Comment Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {comment.user?.username || 'Unknown'}
            </div>
            {comment.is_resolved && (
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
              >
                Resolved
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onResolve(comment.id, comment.is_resolved)}
              className="p-1 rounded hover:bg-gray-200"
              title={comment.is_resolved ? 'Unresolve' : 'Resolve'}
            >
              <CheckCircle
                size={14}
                style={{
                  color: comment.is_resolved ? '#2e7d32' : 'var(--text-secondary)',
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="p-1 rounded hover:bg-gray-200"
              title="Delete"
            >
              <Trash2 size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>

        {/* Comment Text */}
        <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
          {comment.text}
        </div>

        {/* Comment Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {new Date(comment.created_at).toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-200"
            style={{ color: 'var(--text-secondary)' }}
          >
            <MessageSquare size={12} />
            Reply
          </button>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitReply();
                }
              }}
              placeholder="Write a reply... (Ctrl+Enter to submit)"
              className="w-full px-3 py-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                height: '60px',
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText('');
                }}
                className="px-3 py-1.5 text-sm rounded hover:bg-gray-200"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0066cc', color: 'white' }}
              >
                <Send size={14} />
                {isSubmitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={[]} // Replies are already flattened in parent
              onDelete={onDelete}
              onResolve={onResolve}
              onReply={onReply}
              isSubmitting={isSubmitting}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
