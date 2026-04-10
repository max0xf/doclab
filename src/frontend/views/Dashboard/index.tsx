import React, { useState, useEffect } from 'react';
import { MessageSquare, Reply, Clock } from 'lucide-react';

interface Comment {
  id: string;
  text: string;
  author: string;
  repository: string;
  filePath: string;
  lineNumber: number;
  createdAt: string;
  hasReplies?: boolean;
  replyCount?: number;
}

export default function Dashboard() {
  const [recentComments, _setRecentComments] = useState<Comment[]>([]);
  const [myReplies, _setMyReplies] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch recent comments and replies from API
    // For now, show placeholder
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Recent comments and activity
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Comments */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Recent Comments
              </h2>
            </div>
            {recentComments.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No recent comments</p>
                <p className="text-sm mt-1">Comments from repositories will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentComments.map(comment => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {comment.author}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {comment.text}
                    </p>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>{comment.repository}</span>
                      <span>•</span>
                      <span>
                        {comment.filePath}:{comment.lineNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Replies to My Comments */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Reply className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Replies to My Comments
              </h2>
            </div>
            {myReplies.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                <Reply className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No replies yet</p>
                <p className="text-sm mt-1">Replies to your comments will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReplies.map(reply => (
                  <div
                    key={reply.id}
                    className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {reply.author}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {reply.createdAt}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {reply.text}
                    </p>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>{reply.repository}</span>
                      <span>•</span>
                      <span>
                        {reply.filePath}:{reply.lineNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Total Comments
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  0
                </p>
              </div>
              <MessageSquare
                className="w-8 h-8"
                style={{ color: 'var(--primary)', opacity: 0.3 }}
              />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Active Threads
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  0
                </p>
              </div>
              <Reply className="w-8 h-8" style={{ color: 'var(--accent)', opacity: 0.3 }} />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Last Activity
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                  -
                </p>
              </div>
              <Clock className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
