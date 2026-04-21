import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Trash2, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import {
  commentsApi,
  type FileComment,
  type CreateCommentParams,
} from '../../../services/commentsApi';

interface CommentsPanelProps {
  gitProvider: string;
  projectKey: string;
  repoSlug: string;
  branch: string;
  filePath: string;
  fileContent?: string;
  selectedLines: { start: number; end: number } | null;
  onClose: () => void;
  onCommentsChange?: () => void;
  onNavigateToLine?: (lineNumber: number) => void;
  pullRequest?: {
    number: number;
    title: string;
    author: string;
    description?: string;
    source_branch: string;
    target_branch: string;
    created_at: string;
    state: string;
  } | null;
}

interface CommentThreadProps {
  threadComments: FileComment[];
  isSelectedThread: boolean;
  onResolveComment: (comment: FileComment) => void;
  onDeleteComment: (commentId: number) => void;
  formatLineRange: (comment: FileComment) => string;
}

function CommentThread({
  threadComments,
  isSelectedThread,
  onResolveComment,
  onDeleteComment,
  formatLineRange,
}: CommentThreadProps) {
  const [isExpanded, setIsExpanded] = useState(isSelectedThread);

  useEffect(() => {
    setIsExpanded(isSelectedThread);
  }, [isSelectedThread]);

  const sortedComments = [...threadComments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        borderColor: isSelectedThread ? '#0066cc' : 'var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        borderWidth: isSelectedThread ? '2px' : '1px',
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 border-b text-xs font-medium flex items-center justify-between hover:opacity-80"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: isSelectedThread ? '#e3f2fd' : 'var(--bg-primary)',
          color: isSelectedThread ? '#0066cc' : 'var(--text-secondary)',
        }}
      >
        <span>
          {formatLineRange(sortedComments[0])} • {sortedComments.length} comment
          {sortedComments.length > 1 ? 's' : ''}
        </span>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {sortedComments.map((comment, index) => (
            <div
              key={comment.id}
              className="p-3"
              style={{
                backgroundColor:
                  index === sortedComments.length - 1 ? 'var(--bg-primary)' : 'transparent',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {comment.user.username}
                  </div>
                  {comment.status === 'resolved' && (
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
                    onClick={() => onResolveComment(comment)}
                    className="p-1 rounded hover:opacity-70"
                    style={{
                      color:
                        comment.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)',
                    }}
                    title={comment.status === 'resolved' ? 'Reopen' : 'Resolve'}
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="p-1 rounded hover:opacity-70"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p
                className="text-sm whitespace-pre-wrap mb-2"
                style={{
                  color: 'var(--text-primary)',
                  opacity: comment.status === 'resolved' ? 0.6 : 1,
                }}
              >
                {comment.comment_text}
              </p>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsPanel({
  gitProvider,
  projectKey,
  repoSlug,
  branch,
  filePath,
  fileContent,
  selectedLines,
  onClose,
  onCommentsChange,
  onNavigateToLine,
  pullRequest,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<FileComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await commentsApi.list({
        git_provider: gitProvider,
        project_key: projectKey,
        repo_slug: repoSlug,
        branch,
        file_path: filePath,
      });
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [gitProvider, projectKey, repoSlug, branch, filePath]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      const params: CreateCommentParams = {
        git_provider: gitProvider,
        project_key: projectKey,
        repo_slug: repoSlug,
        branch,
        file_path: filePath,
        comment_text: newComment,
      };

      if (selectedLines && fileContent) {
        params.start_line = selectedLines.start;
        params.end_line = selectedLines.end;

        // Extract line content and context for anchoring
        const lines = fileContent.split('\n');
        const startIdx = selectedLines.start - 1;
        const endIdx = selectedLines.end;

        // Get the commented line(s)
        params.line_content = lines.slice(startIdx, endIdx).join('\n');

        // Get context (2 lines before and after)
        params.context_before = lines.slice(Math.max(0, startIdx - 2), startIdx);
        params.context_after = lines.slice(endIdx, Math.min(lines.length, endIdx + 2));
      }

      const comment = await commentsApi.create(params);
      setComments([...comments, comment]);
      setNewComment('');
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleResolveComment = async (comment: FileComment) => {
    try {
      const updated = await commentsApi.update(comment.id, {
        status: comment.status === 'open' ? 'resolved' : 'open',
      });
      setComments(comments.map(c => (c.id === comment.id ? updated : c)));
      onCommentsChange?.();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const formatLineRange = (comment: FileComment) => {
    if (!comment.start_line) {
      return 'Whole file';
    }
    if (comment.start_line === comment.end_line) {
      return `Line ${comment.start_line}`;
    }
    return `Lines ${comment.start_line}-${comment.end_line}`;
  };

  const getUniqueCommentLines = () => {
    const lines = new Set<number>();
    comments.forEach(c => {
      if (c.start_line) {
        lines.add(c.start_line);
      }
    });
    return Array.from(lines).sort((a, b) => a - b);
  };

  const handleNavigateNext = () => {
    if (!onNavigateToLine) {
      return;
    }
    const commentLines = getUniqueCommentLines();
    if (commentLines.length === 0) {
      return;
    }

    const currentLine = selectedLines?.start || 0;
    const nextLine = commentLines.find(line => line > currentLine);

    if (nextLine) {
      onNavigateToLine(nextLine);
    } else {
      // Wrap to first comment
      onNavigateToLine(commentLines[0]);
    }
  };

  const handleNavigatePrev = () => {
    if (!onNavigateToLine) {
      return;
    }
    const commentLines = getUniqueCommentLines();
    if (commentLines.length === 0) {
      return;
    }

    const currentLine = selectedLines?.start || Infinity;
    const prevLine = commentLines.reverse().find(line => line < currentLine);

    if (prevLine) {
      onNavigateToLine(prevLine);
    } else {
      // Wrap to last comment
      onNavigateToLine(commentLines[0]);
    }
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
        width: '400px',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={20} style={{ color: 'var(--text-primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {pullRequest ? 'Pull Request Details' : 'Comments'}
          </h2>
          {!pullRequest && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
              }}
            >
              {comments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNavigatePrev}
            disabled={comments.length === 0}
            className="p-1 rounded hover:opacity-70 disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
            title="Previous comment"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={handleNavigateNext}
            disabled={comments.length === 0}
            className="p-1 rounded hover:opacity-70 disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
            title="Next comment"
          >
            <ChevronDown size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70 ml-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pullRequest ? (
          <div className="p-4 space-y-4">
            <div>
              <a
                href={`https://git.acronis.work/projects/REAL/repos/cyber-repo/pull-requests/${pullRequest.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:opacity-80 transition-opacity"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="text-xs font-medium mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  PR #{pullRequest.number}
                </div>
                <div className="text-lg font-semibold mb-2" style={{ color: 'var(--primary)' }}>
                  {pullRequest.title}
                </div>
              </a>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Author:
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{pullRequest.author}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Branch:
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {pullRequest.source_branch} → {pullRequest.target_branch}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  State:
                </span>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: pullRequest.state === 'open' ? '#e3f2fd' : '#f5f5f5',
                    color: pullRequest.state === 'open' ? '#1976d2' : '#666',
                  }}
                >
                  {pullRequest.state}
                </span>
              </div>
            </div>

            {pullRequest.description && (
              <div>
                <div
                  className="text-xs font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Description
                </div>
                <div
                  className="text-sm p-3 rounded border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {pullRequest.description}
                </div>
              </div>
            )}

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Changed Lines
              </div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Lines highlighted in <span style={{ color: '#28a745' }}>green</span> are additions,
                lines in <span style={{ color: '#d73a49' }}>red</span> are deletions.
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {Object.entries(
              comments.reduce((threads: Record<string, FileComment[]>, comment) => {
                const key = `${comment.start_line || 'file'}-${comment.end_line || 'file'}`;
                if (!threads[key]) {
                  threads[key] = [];
                }
                threads[key].push(comment);
                return threads;
              }, {})
            ).map(([lineKey, threadComments]) => {
              const firstComment = threadComments[0];
              const isSelectedThread = Boolean(
                selectedLines &&
                  firstComment.start_line === selectedLines.start &&
                  (firstComment.end_line || firstComment.start_line) === selectedLines.end
              );

              return (
                <CommentThread
                  key={lineKey}
                  threadComments={threadComments}
                  isSelectedThread={isSelectedThread}
                  onResolveComment={handleResolveComment}
                  onDeleteComment={handleDeleteComment}
                  formatLineRange={formatLineRange}
                />
              );
            })}
          </div>
        )}
      </div>

      {selectedLines && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div
            className="text-sm font-medium mb-3 px-3 py-2 rounded"
            style={{
              backgroundColor: '#e3f2fd',
              color: '#0066cc',
            }}
          >
            {selectedLines.start === selectedLines.end
              ? `Line ${selectedLines.start}`
              : `Lines ${selectedLines.start}-${selectedLines.end}`}
          </div>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Comment on selected lines..."
            className="w-full px-3 py-2 rounded border resize-none"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            rows={3}
          />
          <button
            onClick={handleCreateComment}
            disabled={!newComment.trim() || isSaving}
            className="mt-2 px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 hover:opacity-90"
            style={{
              backgroundColor: '#0066cc',
              color: 'white',
            }}
          >
            <Send size={16} />
            {isSaving ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      )}
    </div>
  );
}
