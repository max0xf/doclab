import React, { useState, useEffect, useCallback } from 'react';
import { GitPullRequest, Clock, MessageSquare, GitCommit, Code } from 'lucide-react';

interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: string;
  source_branch: string;
  target_branch: string;
  created_at: string;
  updated_at: string;
  state: string;
  url: string;
  description?: string;
  commits_count: number;
  loc: number;
  reviewers_count: number;
  comments_count: number;
}

interface PullRequestsTabProps {
  repositoryId: string;
  repositoryFullName: string;
  onPRClick: (pr: PullRequest) => void;
}

export default function PullRequestsTab({
  repositoryId: _repositoryId,
  repositoryFullName,
  onPRClick,
}: PullRequestsTabProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedRepo, setSelectedRepo] = useState('All Repositories');

  const loadPullRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/git/v1/repos/${repositoryFullName}/pulls/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load pull requests: ${response.statusText}`);
      }

      const data = await response.json();
      setPullRequests(data.items || []);
    } catch (err: any) {
      console.error('Failed to load pull requests:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryFullName]);

  useEffect(() => {
    loadPullRequests();
  }, [loadPullRequests]);

  const formatDuration = (createdAt: string) => {
    if (!createdAt) {
      return '-';
    }
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h`;
      }
      return `${diffHours}h`;
    } catch {
      return '-';
    }
  };

  const filteredPRs = pullRequests.filter(pr => {
    const matchesSearch =
      searchQuery === '' ||
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.number.toString().includes(searchQuery) ||
      pr.source_branch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
            style={{ borderColor: 'var(--primary)' }}
          ></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Loading pull requests...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600 mb-4">Error loading pull requests</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <button
            onClick={loadPullRequests}
            className="mt-4 px-4 py-2 rounded"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Pull Requests
          </h2>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {filteredPRs.length} of {pullRequests.length} PRs
          </span>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by title, ID, repo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
          <select
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
            className="px-4 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option>All Repositories</option>
          </select>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-4 py-2 rounded border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <option>All Projects</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead
            className="sticky top-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                PR
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                TITLE
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                AUTHOR
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                REPO
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                PROJECT
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                DURATION
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                COMMITS
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                LOC
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                REVIEWERS
              </th>
              <th
                className="px-4 py-3 text-center text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                COMMENTS
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPRs.map(pr => (
              <tr
                key={pr.id}
                onClick={() => onPRClick(pr)}
                className="border-b cursor-pointer hover:bg-opacity-50 transition-colors"
                style={{ borderColor: 'var(--border-color)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td className="px-4 py-3">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: 'var(--primary)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    #{pr.number}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <GitPullRequest
                      size={16}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: 'var(--primary)' }}
                    />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {pr.title}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {pr.author}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {pr.source_branch}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {repositoryFullName.split('/')[0]}
                </td>
                <td
                  className="px-4 py-3 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={14} />
                    {formatDuration(pr.created_at)}
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <GitCommit size={14} />
                    {pr.commits_count}
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Code size={14} />
                    {pr.loc}
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {pr.reviewers_count}
                </td>
                <td
                  className="px-4 py-3 text-center text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquare size={14} />
                    {pr.comments_count}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPRs.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <GitPullRequest
                size={48}
                className="mx-auto mb-4"
                style={{ color: 'var(--text-secondary)' }}
              />
              <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                No pull requests found
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {searchQuery
                  ? 'Try adjusting your search filters'
                  : 'There are no open pull requests'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
