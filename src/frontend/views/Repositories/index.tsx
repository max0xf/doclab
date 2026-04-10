import React, { useState, useEffect } from 'react';
import { repositoryApi } from '../../services/repositoryApi';
import { Repository, Urls } from '../../types';
import { Settings } from 'lucide-react';
import RepositoryList from './RepositoryList';
import RepositoryDetail from './RepositoryDetail';

export default function Repositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(true);
  const [favorites, setFavorites] = useState<Array<{ id: number; repository_id: string }>>([]);
  const [recentRepos, setRecentRepos] = useState<Array<{ id: number; repository_id: string }>>([]);
  const [repoIdFromUrl, setRepoIdFromUrl] = useState<string | null>(null);
  const [initialFilter, setInitialFilter] = useState<string | null>(null);
  const [allReposLoaded, setAllReposLoaded] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Parse URL and update state when hash changes
  useEffect(() => {
    const parseUrl = () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      setInitialFilter(urlParams.get('filter'));
      setRepoIdFromUrl(urlParams.get('repo'));
    };

    parseUrl();

    // Listen for hash changes
    window.addEventListener('hashchange', parseUrl);
    return () => window.removeEventListener('hashchange', parseUrl);
  }, []);

  useEffect(() => {
    // Load favorites and recent repos from database
    const loadUserPreferences = async () => {
      try {
        // Load both favorites and recent in parallel
        const [favs, recent] = await Promise.all([
          repositoryApi.getFavorites(),
          repositoryApi.getRecent(),
        ]);

        setFavorites(favs);
        setRecentRepos(recent);

        // Only auto-navigate on very first load (when URL is empty or just root)
        const currentHash = window.location.hash;
        const isInitialLoad = !currentHash || currentHash === '#' || currentHash === '#/';

        if (!repoIdFromUrl && isInitialLoad) {
          // This is initial app load with no navigation - auto-select a repo
          // Priority: 1. Most recent, 2. First favorite, 3. Show repository list
          if (recent.length > 0) {
            // Open most recent repo
            const mostRecentId = recent[0].repository_id;
            window.location.hash = `${Urls.Repositories}?repo=${mostRecentId}`;
            setIsLoading(false);
            return;
          } else if (favs.length > 0) {
            // Open first favorite repo
            const firstFavoriteId = favs[0].repository_id;
            window.location.hash = `${Urls.Repositories}?repo=${firstFavoriteId}`;
            setIsLoading(false);
            return;
          }
        }

        // If no repo in URL, load repository list
        if (!repoIdFromUrl) {
          loadRepositories();
        }
      } catch (e) {
        console.error('Failed to load user preferences', e);
        // On error, load all repositories
        loadRepositories();
      }
    };

    loadUserPreferences();
  }, [repoIdFromUrl]);

  const loadRepositories = async (loadAll: boolean = false) => {
    if (loadAll) {
      setIsLoadingAll(true);
    }
    try {
      const limit = loadAll ? 0 : 100;
      const data = await repositoryApi.list(limit);
      setRepositories(data);
      setAllReposLoaded(loadAll);
      // Don't auto-select any repo - just show the list
      setHasToken(true);
      setError(null);
    } catch (err: any) {
      // Try to parse the error response
      let errorDetail = 'Failed to load repositories';
      let isAuthError = false;

      if (err?.message) {
        const message = err.message.toLowerCase();
        if (
          message.includes('401') ||
          message.includes('unauthorized') ||
          message.includes('authentication')
        ) {
          isAuthError = true;
          errorDetail =
            'Authentication failed. Please check your Git token and URL in profile settings.';
        } else if (message.includes('404') || message.includes('not found')) {
          errorDetail =
            'Git provider endpoint not found. Please check your URL configuration in profile settings.';
        } else {
          errorDetail = err.message;
        }
      }

      if (isAuthError) {
        setHasToken(false);
      } else {
        setError(errorDetail);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingAll(false);
    }
  };

  const saveFavorites = async (newFavorites: Array<{ id: number; repository_id: string }>) => {
    setFavorites(newFavorites);
    // Dispatch custom event to update sidebar
    window.dispatchEvent(new Event('repositoriesUpdated'));
  };

  const toggleFavorite = async (repoId: string) => {
    console.log('toggleFavorite called for:', repoId);
    console.log('Current favorites:', favorites);
    const existingFavorite = favorites.find(f => f.repository_id === repoId);
    console.log('Is currently favorite?', !!existingFavorite);

    try {
      if (existingFavorite) {
        console.log('Removing from favorites...');
        await repositoryApi.removeFavorite(existingFavorite.id);
        const newFavorites = favorites.filter(f => f.repository_id !== repoId);
        console.log('New favorites after remove:', newFavorites);
        saveFavorites(newFavorites);
      } else {
        console.log('Adding to favorites...');
        const newFavorite = await repositoryApi.addFavorite(repoId);
        const newFavorites = [...favorites, newFavorite];
        console.log('New favorites after add:', newFavorites);
        saveFavorites(newFavorites);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSelectRepo = React.useCallback(async (repo: Repository) => {
    setSelectedRepo(repo);
    // Recent repos are auto-tracked by backend, just refresh the list
    try {
      const recent = await repositoryApi.getRecent();
      setRecentRepos(recent);
      window.dispatchEvent(new Event('repositoriesUpdated'));
    } catch (error) {
      console.error('Failed to refresh recent repos:', error);
    }
  }, []);

  const handleBackToList = () => {
    setSelectedRepo(null);
    // Clear repo from URL to show list
    window.location.hash = Urls.Repositories;
    // Load repositories when going back to list
    if (repositories.length === 0) {
      loadRepositories();
    }
  };

  // If repo ID is in URL, fetch and display that specific repo
  useEffect(() => {
    if (repoIdFromUrl) {
      const loadSpecificRepo = async () => {
        try {
          setIsLoading(true);
          const repo = await repositoryApi.getById(repoIdFromUrl);
          setSelectedRepo(repo);
          setHasToken(true);
          setError(null);

          // Refresh recent repos (auto-tracked by backend)
          const recent = await repositoryApi.getRecent();
          setRecentRepos(recent);
          window.dispatchEvent(new Event('repositoriesUpdated'));
        } catch (err: any) {
          console.error('Failed to load repository:', err);
          setError('Failed to load repository. It may not exist or you may not have access.');
        } finally {
          setIsLoading(false);
        }
      };

      loadSpecificRepo();
    } else {
      // No repo in URL, clear selection to show list
      setSelectedRepo(null);
    }
  }, [repoIdFromUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
            style={{ borderColor: 'var(--primary)' }}
          ></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            Loading repositories...
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Please wait while we fetch your repositories
          </p>
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center">
          <Settings size={48} className="mx-auto mb-4 text-text-secondary" />
          <h2 className="text-xl font-bold mb-2">Git Configuration Required</h2>
          <p className="text-text-secondary mb-6">
            You need to configure your Git provider settings to access repositories. Please go to
            your profile settings to configure your Git provider, URL, and token.
          </p>
          <a
            href="#profile"
            className="inline-block bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover"
          >
            Go to Profile Settings
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-bold mb-2 text-red-800">Error Loading Repositories</h2>
            <p className="text-red-700 mb-4">{error}</p>
          </div>
          <button
            onClick={() => loadRepositories(false)}
            className="inline-block bg-primary text-white px-6 py-2 rounded font-medium hover:bg-primary-hover mr-2"
          >
            Retry
          </button>
          <a
            href="#profile"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-2 rounded font-medium hover:bg-gray-300"
          >
            Go to Profile Settings
          </a>
        </div>
      </div>
    );
  }

  // Show repository detail if a repo is selected (from favorites/recent or list)
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

  // Show "No Repositories" only if no repo is selected and repositories array is empty
  if (repositories.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="max-w-md text-center">
          <Settings size={48} className="mx-auto mb-4 text-text-secondary" />
          <h2 className="text-xl font-bold mb-2">No Repositories Found</h2>
          <p className="text-text-secondary">
            No repositories are available. Check your token permissions or contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RepositoryList
      repositories={repositories}
      favorites={favorites}
      recentRepos={recentRepos}
      onSelectRepo={handleSelectRepo}
      onToggleFavorite={toggleFavorite}
      initialFilter={initialFilter}
      allReposLoaded={allReposLoaded}
      isLoadingAll={isLoadingAll}
      onLoadAll={() => loadRepositories(true)}
    />
  );
}
