import React, { useState, useEffect } from 'react';
import { Send, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { CommentEnrichment } from '../../../services/enrichmentApi';
import { apiClient } from '../../../services/apiClient';
import { Comment } from '../../enrichments/Comment';

interface CommentsTabProps {
  comments: CommentEnrichment[];
  fileName: string;
  sourceUri: string;
  selectedLines: { start: number; end: number } | null;
  onCommentsChange?: () => void;
}

export function CommentsTab({
  comments: _enrichmentComments,
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
  const [docCommentsExpanded, setDocCommentsExpanded] = useState(true);
  const [comments, setComments] = useState<CommentEnrichment[]>([]);

  // Fetch comments from comments API (returns nested structure with replies)
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await apiClient.request(
          `/api/wiki/v1/comments/?source_uri=${encodeURIComponent(sourceUri)}`
        );
        setComments((response as CommentEnrichment[]) || []);
      } catch (error) {
        console.error('Failed to fetch comments:', error);
        setComments([]);
      }
    };
    fetchComments();
  }, [sourceUri, onCommentsChange]);

  // API returns root comments with nested replies in the 'replies' field
  // Separate document-level comments from line comments
  const docRootComments = comments.filter(c => !c.line_start && !c.line_end);
  const lineRootComments = comments.filter(c => c.line_start || c.line_end);

  // Sort line comments by line number
  lineRootComments.sort((a, b) => (a.line_start || 0) - (b.line_start || 0));

  // Auto-expand selected comment
  useEffect(() => {
    if (selectedLines) {
      const matchingComment = lineRootComments.find(
        c => c.line_start === selectedLines.start && c.line_end === selectedLines.end
      );
      if (matchingComment) {
        setExpandedThreads(prev => new Set(prev).add(String(matchingComment.id)));
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

  const handleSubmitReply = async (parentId: string, text: string) => {
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

  const handleDeleteComment = async (commentId: string) => {
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

  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Comment Threads - Scrollable */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {/* Document Comments Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setDocCommentsExpanded(!docCommentsExpanded)}
              className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
            >
              {docCommentsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FileText size={16} />
              Document Comments ({docRootComments.length})
            </button>
            {docCommentsExpanded && !showDocCommentForm && (
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
          {docCommentsExpanded && showDocCommentForm && (
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
          {docCommentsExpanded && docRootComments.length > 0 && (
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
                    replies={comment.replies || []}
                    onDelete={handleDeleteComment}
                    onResolve={handleResolveComment}
                    onReply={handleSubmitReply}
                    isSubmitting={isSubmitting}
                  />
                </div>
              ))}
            </div>
          )}

          {docCommentsExpanded && docRootComments.length === 0 && !showDocCommentForm && (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              No document comments yet
            </div>
          )}
        </div>

        {/* Line Comments Section */}
        {lineRootComments.length > 0 && (
          <div className="border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Line Comments ({lineRootComments.length})
            </div>
            <div className="space-y-3">
              {lineRootComments.map(comment => {
                const commentId = String(comment.id);
                const isExpanded = expandedThreads.has(commentId);
                const isSelected =
                  selectedLines &&
                  comment.line_start === selectedLines.start &&
                  comment.line_end === selectedLines.end;
                const replyCount = comment.replies?.length || 0;
                const totalCount = 1 + replyCount;

                return (
                  <div
                    key={comment.id}
                    className="border rounded-lg overflow-hidden"
                    style={{
                      borderColor: isSelected ? '#0066cc' : 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                  >
                    {/* Comment Header */}
                    <button
                      type="button"
                      onClick={() => toggleThread(commentId)}
                      className="w-full px-3 py-2 border-b text-xs font-medium flex items-center justify-between hover:opacity-80"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: isSelected ? '#e3f2fd' : 'var(--bg-primary)',
                        color: isSelected ? '#0066cc' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Line {comment.line_start} • {totalCount} comment{totalCount > 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* Comment with Replies */}
                    {isExpanded && (
                      <Comment
                        comment={comment}
                        replies={comment.replies || []}
                        onDelete={handleDeleteComment}
                        onResolve={handleResolveComment}
                        onReply={handleSubmitReply}
                        isSubmitting={isSubmitting}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lineRootComments.length === 0 && docRootComments.length === 0 && (
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
            {selectedLines.start === selectedLines.end
              ? `Line ${selectedLines.start}`
              : `Lines ${selectedLines.start}-${selectedLines.end}`}
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
