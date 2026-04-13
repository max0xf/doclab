import React, { useState, useEffect } from 'react';
import { projectApi, Project } from '../../services/projectApi';
import { repositoryApi } from '../../services/repositoryApi';
import { serviceTokensApi } from '../../services/serviceTokensApi';
import { Repository } from '../../types';
import { ChevronRight, ChevronDown, Folder, Search, Loader, Star, Settings } from 'lucide-react';
import RepositoryDetail from './RepositoryDetail';

interface ProjectWithRepos extends Project {
  repositories?: Repository[];
  isExpanded?: boolean;
  isLoadingRepos?: boolean;
}

export default function Repositories() {
  const [projects, setProjects] = useState<ProjectWithRepos[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Array<{ id: string; repository_id: string }>>([]);
  const [repoIdFromUrl, setRepoIdFromUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<{ type: string; baseUrl: string } | null>(null);

  // Parse URL and update state when hash changes
  useEffect(() => {
    const parseUrl = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      setRepoIdFromUrl(urlParams.get('repo'));
    };

    parseUrl();

    // Listen for hash changes
    window.addEventListener('hashchange', parseUrl);
    return () => window.removeEventListener('hashchange', parseUrl);
  }, []);

  useEffect(() => {
    // Load favorites from database
    const loadUserPreferences = async () => {
      try {
        const favs = await repositoryApi.getFavorites();
        setFavorites(favs);

        // If repo in URL, load it
        if (!repoIdFromUrl) {
          loadProjects();
        }
      } catch (e) {
        console.error('Failed to load user preferences', e);
        loadProjects();
      }
    };

    loadUserPreferences();
  }, [repoIdFromUrl]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get service tokens to find git provider
      const tokens = await serviceTokensApi.list();
      const gitToken = tokens.find(
        t => t.service_type === 'github' || t.service_type === 'bitbucket_server'
      );

      if (!gitToken) {
        setError('No git provider configured. Please configure in Configuration page.');
        setIsLoading(false);
        return;
      }

      setProvider({ type: gitToken.service_type, baseUrl: gitToken.base_url });

      // Load projects
      const projectsList = await projectApi.list(gitToken.service_type, gitToken.base_url);
      setProjects(projectsList.map(p => ({ ...p, isExpanded: false, isLoadingRepos: false })));
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.detail || err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProject = async (projectKey: string) => {
    const project = projects.find(p => p.key === projectKey);
    if (!project) {
      return;
    }

    // If already expanded, just collapse
    if (project.isExpanded) {
      setProjects(projects.map(p => (p.key === projectKey ? { ...p, isExpanded: false } : p)));
      return;
    }

    // If repos not loaded yet, load them
    if (!project.repositories && provider) {
      setProjects(projects.map(p => (p.key === projectKey ? { ...p, isLoadingRepos: true } : p)));

      try {
        const repos = await projectApi.listRepositories(
          provider.type,
          provider.baseUrl,
          projectKey
        );
        setProjects(
          projects.map(p =>
            p.key === projectKey
              ? { ...p, repositories: repos, isExpanded: true, isLoadingRepos: false }
              : p
          )
        );
      } catch (err) {
        console.error(`Failed to load repos for ${projectKey}:`, err);
        setProjects(
          projects.map(p => (p.key === projectKey ? { ...p, isLoadingRepos: false } : p))
        );
      }
    } else {
      // Repos already loaded, just expand
      setProjects(projects.map(p => (p.key === projectKey ? { ...p, isExpanded: true } : p)));
    }
  };

  const toggleFavorite = async (repoId: string) => {
    const existingFavorite = favorites.find(f => f.repository_id === repoId);

    try {
      if (existingFavorite) {
        await repositoryApi.removeFavorite(existingFavorite.id);
        setFavorites(favorites.filter(f => f.repository_id !== repoId));
      } else {
        const newFavorite = await repositoryApi.addFavorite(repoId);
        setFavorites([...favorites, newFavorite]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleRepoClick = (repo: Repository) => {
    setSelectedRepo(repo);
    window.location.hash = `#/repositories?repo=${repo.id}`;

    // Track as recent (if method exists)
    if ('addRecent' in repositoryApi) {
      (repositoryApi as any).addRecent(repo.id).catch((err: any) => {
        console.error('Failed to add to recent:', err);
      });
    }
  };

  const handleBackToList = () => {
    setSelectedRepo(null);
    window.location.hash = '#/repositories';
  };

  // Filter projects and repos by search query
  const filteredProjects = projects.filter(project => {
    const projectMatches =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const repoMatches =
      project.repositories?.some(
        repo =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) || false;

    return projectMatches || repoMatches;
  });

  // Show repository detail if a repo is selected
  if (selectedRepo) {
    return (
      <RepositoryDetail
        key={selectedRepo.id}
        repository={selectedRepo}
        isFavorite={favorites.some(f => f.repository_id === selectedRepo.id)}
        onBack={handleBackToList}
        onToggleFavorite={toggleFavorite}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-text-secondary">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-2xl text-center px-4">
          <Settings size={48} className="mx-auto mb-4 text-text-secondary" />
          <h2 className="text-xl font-bold mb-2">Error Loading Projects</h2>
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-red-800 font-semibold mb-2">Error</p>
            <p className="text-red-700 whitespace-pre-line">{error}</p>
            <p className="text-red-600 text-sm mt-3">
              Please update your tokens in the{' '}
              <a href="#/configuration" className="underline font-semibold">
                Configuration page
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-surface">
        <h1 className="text-2xl font-bold mb-4">Repositories</h1>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
            size={20}
          />
          <input
            type="text"
            placeholder="Search projects and repositories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
          />
        </div>

        <p className="text-sm text-text-secondary mt-2">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Projects Table */}
      <div className="flex-1 overflow-auto">
        {filteredProjects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-secondary">No projects or repositories found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-secondary sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">
                  Project / Repository
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">
                  Key
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-text-secondary">
                  Description
                </th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-text-secondary w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(project => (
                <React.Fragment key={project.key}>
                  {/* Project Row */}
                  <tr className="border-b border-border hover:bg-surface-hover">
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleProject(project.key)}
                        className="flex items-center gap-2 text-left w-full"
                      >
                        {project.isLoadingRepos ? (
                          <Loader className="animate-spin flex-shrink-0" size={16} />
                        ) : project.isExpanded ? (
                          <ChevronDown className="flex-shrink-0" size={16} />
                        ) : (
                          <ChevronRight className="flex-shrink-0" size={16} />
                        )}
                        <Folder className="flex-shrink-0 text-primary" size={18} />
                        <span className="font-semibold">{project.name}</span>
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-mono text-text-secondary">{project.key}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-text-secondary truncate max-w-md block">
                        {project.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {project.repositories && (
                        <span className="text-xs text-text-secondary">
                          {project.repositories.length} repo
                          {project.repositories.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Repository Rows (when expanded) */}
                  {project.isExpanded &&
                    project.repositories &&
                    project.repositories
                      .filter(
                        repo =>
                          !searchQuery ||
                          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(repo => (
                        <tr
                          key={repo.id}
                          className="border-b border-border hover:bg-surface-hover bg-surface-secondary"
                        >
                          <td className="px-6 py-2 pl-16">
                            <button
                              onClick={() => handleRepoClick(repo)}
                              className="flex items-center gap-2 text-left hover:text-primary"
                            >
                              <span className="font-medium">{repo.name}</span>
                            </button>
                          </td>
                          <td className="px-6 py-2">
                            <span className="text-xs font-mono text-text-secondary">{repo.id}</span>
                          </td>
                          <td className="px-6 py-2">
                            <span className="text-sm text-text-secondary truncate max-w-md block">
                              {repo.description || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-center">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                toggleFavorite(repo.id);
                              }}
                              className="p-1 hover:bg-surface-hover rounded"
                            >
                              <Star
                                size={16}
                                className={
                                  favorites.some(f => f.repository_id === repo.id)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-text-secondary'
                                }
                              />
                            </button>
                          </td>
                        </tr>
                      ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
