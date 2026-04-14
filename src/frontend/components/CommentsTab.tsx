import React, { useState, useEffect } from 'react';
import { Send, Trash2, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { CommentEnrichment } from '../services/enrichmentApi';
import { apiClient } from '../services/apiClient';

interface CommentsTabProps {
  comments: CommentEnrichment[];
  fileName: string;
  sourceUri: string;
  selectedLines: { start: number; end: number } | null;
  onCommentsChange?: () => void;
}

interface CommentThread {
  threadId: string;
  comments: CommentEnrichment[];
  lineStart: number;
  lineEnd: number;
}

export function CommentsTab({
  comments,
  fileName: _fileName,
  sourceUri,
  selectedLines,
  onCommentsChange,
}: CommentsTabProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Group comments by thread
  const threads: CommentThread[] = [];
  const threadMap = new Map<string, CommentThread>();

  comments.forEach(comment => {
    const threadId = comment.thread_id || String(comment.id);
    if (!threadMap.has(threadId)) {
      threadMap.set(threadId, {
        threadId,
        comments: [],
        lineStart: comment.line_start || 0,
        lineEnd: comment.line_end || 0,
      });
      threads.push(threadMap.get(threadId)!);
    }
    threadMap.get(threadId)!.comments.push(comment);
  });

  // Sort threads by line number
  threads.sort((a, b) => a.lineStart - b.lineStart);

  // Auto-expand selected thread
  useEffect(() => {
    if (selectedLines) {
      const matchingThread = threads.find(
        t => t.lineStart === selectedLines.start && t.lineEnd === selectedLines.end
      );
      if (matchingThread) {
        setExpandedThreads(prev => new Set(prev).add(matchingThread.threadId));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLines]);

  const handleSubmitComment = async () => {
    if (!newCommentText.trim() || !selectedLines) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.request('/api/wiki/v1/comments/', {
        method: 'POST',
        body: JSON.stringify({
          source_uri: sourceUri,
          line_start: selectedLines.start,
          line_end: selectedLines.end,
          text: newCommentText,
        }),
      });

      setNewCommentText('');
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to create comment:', error);
      alert('Failed to create comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    try {
      await apiClient.request(`/api/wiki/v1/comments/${commentId}/`, {
        method: 'DELETE',
      });
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleResolveComment = async (commentId: number, isResolved: boolean) => {
    try {
      const action = isResolved ? 'unresolve' : 'resolve';
      await apiClient.request(`/api/wiki/v1/comments/${commentId}/${action}/`, {
        method: 'POST',
      });
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      alert('Failed to resolve comment');
    }
  };

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const formatLineRange = (thread: CommentThread) => {
    if (thread.lineStart === thread.lineEnd) {
      return `Line ${thread.lineStart}`;
    }
    return `Lines ${thread.lineStart}-${thread.lineEnd}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Comment Threads - Scrollable */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {threads.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-sm">No comments yet</div>
            {!selectedLines && <div className="text-xs mt-1">Click a line to add a comment</div>}
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => {
              const isExpanded = expandedThreads.has(thread.threadId);
              const isSelected =
                selectedLines &&
                thread.lineStart === selectedLines.start &&
                thread.lineEnd === selectedLines.end;
              const sortedComments = [...thread.comments].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );

              return (
                <div
                  key={thread.threadId}
                  className="border rounded-lg overflow-hidden"
                  style={{
                    borderColor: isSelected ? '#0066cc' : 'var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderWidth: isSelected ? '2px' : '1px',
                  }}
                >
                  {/* Thread Header */}
                  <button
                    type="button"
                    onClick={() => toggleThread(thread.threadId)}
                    className="w-full px-3 py-2 border-b text-xs font-medium flex items-center justify-between hover:opacity-80"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: isSelected ? '#e3f2fd' : 'var(--bg-primary)',
                      color: isSelected ? '#0066cc' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {formatLineRange(thread)} • {thread.comments.length} comment
                      {thread.comments.length > 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Thread Comments */}
                  {isExpanded && (
                    <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                      {sortedComments.map((comment, index) => (
                        <div
                          key={comment.id}
                          className="p-3"
                          style={{
                            backgroundColor:
                              index === sortedComments.length - 1
                                ? 'var(--bg-primary)'
                                : 'transparent',
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="font-medium text-sm"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {comment.user?.username || 'Unknown'}
                              </div>
                              {comment.is_resolved && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: '#e8f5e9',
                                    color: '#2e7d32',
                                  }}
                                >
                                  Resolved
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleResolveComment(comment.id, comment.is_resolved)
                                }
                                className="p-1 rounded hover:bg-gray-200"
                                title={comment.is_resolved ? 'Unresolve' : 'Resolve'}
                              >
                                <CheckCircle
                                  size={14}
                                  style={{
                                    color: comment.is_resolved
                                      ? '#2e7d32'
                                      : 'var(--text-secondary)',
                                  }}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 rounded hover:bg-gray-200"
                                title="Delete"
                              >
                                <Trash2 size={14} style={{ color: 'var(--text-secondary)' }} />
                              </button>
                            </div>
                          </div>
                          <div
                            className="text-sm whitespace-pre-wrap"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {comment.text}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(comment.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Comment Form - Fixed at Bottom */}
      {selectedLines && (
        <div
          className="flex-shrink-0 flex-grow-0 px-4 py-3 border-t"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Add comment to{' '}
            {formatLineRange({
              lineStart: selectedLines.start,
              lineEnd: selectedLines.end,
            } as CommentThread)}
          </div>
          <textarea
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Enter your comment... (Ctrl+Enter to submit)"
            className="w-full px-3 py-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              height: '80px',
              maxHeight: '120px',
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={!newCommentText.trim() || isSubmitting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0066cc',
                color: 'white',
              }}
            >
              <Send size={14} />
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
