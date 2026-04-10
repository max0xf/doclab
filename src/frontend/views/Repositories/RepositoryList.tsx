import React, { useState, useMemo } from 'react';
import { Repository } from '../../types';
import { Search, Star, Clock, Lock, Globe, ChevronRight } from 'lucide-react';

interface RepositoryListProps {
  repositories: Repository[];
  favorites: Array<{ id: number; repository_id: string }>;
  recentRepos: Array<{ id: number; repository_id: string }>;
  onSelectRepo: (repo: Repository) => void;
  onToggleFavorite: (repoId: string) => void;
  initialFilter?: string | null;
  allReposLoaded: boolean;
  isLoadingAll: boolean;
  onLoadAll: () => void;
}

export default function RepositoryList({
  repositories,
  favorites,
  recentRepos,
  onSelectRepo,
  onToggleFavorite,
  initialFilter,
  allReposLoaded,
  isLoadingAll,
  onLoadAll,
}: RepositoryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialFilter === 'favorites');
  const [showRecentOnly, setShowRecentOnly] = useState(initialFilter === 'recent');

  const filteredRepos = useMemo(() => {
    let filtered = repositories;

    // Apply favorites or recent filter first
    if (showFavoritesOnly) {
      filtered = filtered.filter(repo => favorites.some(f => f.repository_id === repo.id));
    } else if (showRecentOnly) {
      filtered = filtered.filter(repo => recentRepos.some(r => r.repository_id === repo.id));
    }

    // Then apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(repo => {
        const name = repo.name || '';
        const fullName = repo.fullName || '';
        const description = repo.description || '';
        return (
          name.toLowerCase().includes(query) ||
          fullName.toLowerCase().includes(query) ||
          description.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [repositories, searchQuery, showFavoritesOnly, showRecentOnly, favorites, recentRepos]);

  const favoriteRepos = repositories.filter(repo =>
    favorites.some(f => f.repository_id === repo.id)
  );
  const recentRepositories = repositories.filter(repo =>
    recentRepos.some(r => r.repository_id === repo.id)
  );

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Loading overlay for Load All Repositories */}
      {isLoadingAll && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="text-center">
            <div
              className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 mb-4"
              style={{ borderColor: 'var(--primary)' }}
            ></div>
            <p className="text-lg font-medium text-white">Loading all repositories...</p>
            <p className="text-sm mt-2 text-gray-300">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
      >
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Repositories
        </h1>

        {/* Search and filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            onClick={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              setShowRecentOnly(false);
            }}
            className={`px-4 py-2 rounded border flex items-center gap-2 transition-colors ${
              showFavoritesOnly ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: showFavoritesOnly ? 'var(--primary)' : 'var(--bg-secondary)',
              borderColor: showFavoritesOnly ? 'var(--primary)' : 'var(--border-color)',
              color: showFavoritesOnly ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            <Star size={16} fill={showFavoritesOnly ? '#ffffff' : 'none'} />
            Favorites
          </button>
          <button
            onClick={() => {
              setShowRecentOnly(!showRecentOnly);
              setShowFavoritesOnly(false);
            }}
            className={`px-4 py-2 rounded border flex items-center gap-2 transition-colors ${
              showRecentOnly ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: showRecentOnly ? 'var(--primary)' : 'var(--bg-secondary)',
              borderColor: showRecentOnly ? 'var(--primary)' : 'var(--border-color)',
              color: showRecentOnly ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            <Clock size={16} />
            Recent
          </button>
          {searchQuery.trim() && !allReposLoaded && (
            <button
              onClick={onLoadAll}
              className="px-4 py-2 rounded-md font-medium transition-all"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
              }}
            >
              Load All Repositories
            </button>
          )}
        </div>

        <div className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {searchQuery.trim()
            ? `Found ${filteredRepos.length} repositories`
            : `Showing ${filteredRepos.length} of ${repositories.length} repositories`}
        </div>
      </div>

      {/* Quick access sections */}
      {!searchQuery &&
        !showFavoritesOnly &&
        !showRecentOnly &&
        (favoriteRepos.length > 0 || recentRepositories.length > 0) && (
          <div
            className="border-b px-6 py-4 space-y-4"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {favoriteRepos.length > 0 && (
              <div>
                <h2
                  className="text-sm font-semibold uppercase mb-2 flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Star size={14} />
                  Favorites
                </h2>
                <div className="flex flex-wrap gap-2">
                  {favoriteRepos.slice(0, 5).map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => onSelectRepo(repo)}
                      className="px-3 py-1.5 rounded border text-sm hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {repo.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recentRepositories.length > 0 && (
              <div>
                <h2
                  className="text-sm font-semibold uppercase mb-2 flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Clock size={14} />
                  Recently Viewed
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recentRepositories.slice(0, 5).map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => onSelectRepo(repo)}
                      className="px-3 py-1.5 rounded border text-sm hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {repo.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Repository list */}
      <div className="flex-1 overflow-auto">
        {filteredRepos.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--text-secondary)' }}>
              {searchQuery
                ? 'No repositories match your search'
                : showFavoritesOnly
                  ? 'No favorite repositories yet'
                  : showRecentOnly
                    ? 'No recently viewed repositories'
                    : 'No repositories found'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead
              className="sticky top-0 border-b"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '40px' }}
                ></th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '40px' }}
                ></th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '150px' }}
                >
                  Project ID
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '200px' }}
                >
                  Repo Slug
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '250px' }}
                >
                  Project Name
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Description
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase"
                  style={{ color: 'var(--text-secondary)', width: '80px' }}
                ></th>
              </tr>
            </thead>
            <tbody>
              {filteredRepos.map(repo => {
                const isFavorite = favorites.some(f => f.repository_id === repo.id);
                const [projectId, repoSlug] = repo.id.split('_');

                return (
                  <tr
                    key={repo.id}
                    className="border-b hover:bg-opacity-50 cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--border-color)',
                    }}
                    onClick={() => onSelectRepo(repo)}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(repo.id);
                        }}
                        className="p-1 hover:opacity-70 transition-opacity"
                        style={{ color: isFavorite ? 'var(--warning)' : 'var(--text-secondary)' }}
                      >
                        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {repo.isPrivate ? <Lock size={16} /> : <Globe size={16} />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                        {projectId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                        {repoSlug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {repo.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: repo.isPrivate ? '#fff4e5' : '#e6ffed',
                            color: repo.isPrivate ? '#ff9800' : '#28a745',
                          }}
                        >
                          {repo.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {repo.description || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
