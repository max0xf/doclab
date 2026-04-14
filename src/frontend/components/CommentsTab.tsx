import React, { useState, useEffect } from 'react';
import { Send, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { CommentEnrichment } from '../services/enrichmentApi';
import { apiClient } from '../services/apiClient';
import { Comment } from './Comment';

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
  const [newDocCommentText, setNewDocCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showDocCommentForm, setShowDocCommentForm] = useState(false);

  // Separate document-level comments from line comments
  const lineComments = comments.filter(c => c.line_start || c.line_end);

  // Build comment tree for document comments
  const buildCommentTree = (allComments: CommentEnrichment[]) => {
    const rootComments = allComments.filter(c => !c.parent_id);
    const getReplies = (parentId: number): CommentEnrichment[] => {
      return allComments
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    };
    return { rootComments, getReplies };
  };

  const { rootComments: docRootComments, getReplies: getDocReplies } = buildCommentTree(
    comments.filter(c => !c.line_start && !c.line_end)
  );

  // Group line comments by thread
  const threads: CommentThread[] = [];
  const threadMap = new Map<string, CommentThread>();

  lineComments.forEach(comment => {
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

  const handleSubmitDocComment = async () => {
    if (!newDocCommentText.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.request('/api/wiki/v1/comments/', {
        method: 'POST',
        body: JSON.stringify({
          source_uri: sourceUri,
          text: newDocCommentText,
        }),
      });

      setNewDocCommentText('');
      setShowDocCommentForm(false);
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to create document comment:', error);
      alert('Failed to create document comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number, text: string) => {
    if (!text.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.request('/api/wiki/v1/comments/', {
        method: 'POST',
        body: JSON.stringify({
          source_uri: sourceUri,
          parent_comment: parentId,
          text,
        }),
      });

      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to create reply');
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
        {/* Document Comments Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              <FileText size={16} />
              Document Comments ({docRootComments.length})
            </div>
            {!showDocCommentForm && (
              <button
                type="button"
                onClick={() => setShowDocCommentForm(true)}
                className="text-xs px-3 py-1.5 rounded hover:opacity-80"
                style={{ backgroundColor: '#0066cc', color: 'white' }}
              >
                Add Comment
              </button>
            )}
          </div>

          {/* Document Comment Form */}
          {showDocCommentForm && (
            <div
              className="mb-3 p-3 border rounded-lg"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <textarea
                value={newDocCommentText}
                onChange={e => setNewDocCommentText(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitDocComment();
                  }
                }}
                placeholder="Comment on the entire document... (Ctrl+Enter to submit)"
                className="w-full px-3 py-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  height: '80px',
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocCommentForm(false);
                    setNewDocCommentText('');
                  }}
                  className="px-3 py-1.5 text-sm rounded hover:bg-gray-200"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDocComment}
                  disabled={!newDocCommentText.trim() || isSubmitting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#0066cc', color: 'white' }}
                >
                  <Send size={14} />
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Document Comments List */}
          {docRootComments.length > 0 && (
            <div className="space-y-2">
              {docRootComments.map(comment => (
                <div
                  key={comment.id}
                  className="border rounded-lg overflow-hidden"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <Comment
                    comment={comment}
                    replies={getDocReplies(comment.id)}
                    onDelete={handleDeleteComment}
                    onResolve={handleResolveComment}
                    onReply={handleSubmitReply}
                    isSubmitting={isSubmitting}
                  />
                </div>
              ))}
            </div>
          )}

          {docRootComments.length === 0 && !showDocCommentForm && (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              No document comments yet
            </div>
          )}
        </div>

        {/* Line Comments Section */}
        {threads.length > 0 && (
          <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Line Comments ({threads.length})
            </div>
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
                      <div>
                        {sortedComments.map(comment => (
                          <Comment
                            key={comment.id}
                            comment={comment}
                            replies={[]}
                            onDelete={handleDeleteComment}
                            onResolve={handleResolveComment}
                            onReply={handleSubmitReply}
                            isSubmitting={isSubmitting}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {threads.length === 0 && docRootComments.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-sm">No comments yet</div>
            {!selectedLines && <div className="text-xs mt-1">Click a line to add a comment</div>}
          </div>
        )}
      </div>

      {/* New Line Comment Form - Fixed at Bottom */}
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
