import { apiClient } from './apiClient';
import { Repository, ApiToken } from '../types';

interface ListResponse<T> {
  items: T[];
}

export const repositoryApi = {
  // List repositories from all configured git providers
  list: async (limit?: number): Promise<Repository[]> => {
    // Get user's service tokens to find configured git providers
    const serviceTokensApi = await import('./serviceTokensApi');
    const tokens = await serviceTokensApi.serviceTokensApi.list();

    // Filter for git provider tokens (github, bitbucket_server)
    const gitTokens = tokens.filter(
      t => t.service_type === 'github' || t.service_type === 'bitbucket_server'
    );

    if (gitTokens.length === 0) {
      return [];
    }

    // Fetch repositories from each git provider
    const allRepos: Repository[] = [];
    for (const token of gitTokens) {
      try {
        // If limit is 0 or not set, fetch all pages
        const fetchAll = !limit || limit === 0;
        let page = 1;
        let hasMore = true;
        const seenIds = new Set<string>();
        let lowYieldPages = 0; // Count pages with <10% new repos

        while (hasMore) {
          const params = new URLSearchParams({
            provider: token.service_type,
            page: page.toString(),
            per_page: '1000',
          });

          // Only add base_url if it's not empty
          if (token.base_url) {
            params.append('base_url', token.base_url);
          }

          console.log(
            `Fetching repos from ${token.service_type} page ${page} with params:`,
            params.toString()
          );

          const response = await apiClient.request<{
            repositories: Repository[];
            is_last_page?: boolean;
            total?: number;
          }>(`/api/git-provider/v1/repositories/repositories/?${params.toString()}`);

          const repos = response.repositories || [];

          // Check for duplicates
          let newRepos = 0;
          let duplicates = 0;
          for (const repo of repos) {
            if (!seenIds.has(repo.id)) {
              seenIds.add(repo.id);
              allRepos.push(repo);
              newRepos++;
            } else {
              duplicates++;
            }
          }

          const duplicateRate = repos.length > 0 ? (duplicates / repos.length) * 100 : 0;
          const newRepoRate = repos.length > 0 ? (newRepos / repos.length) * 100 : 0;

          // Track low-yield pages (< 10% new repos)
          if (newRepoRate < 10) {
            lowYieldPages++;
          } else {
            lowYieldPages = 0; // Reset counter if we get a good page
          }

          console.log(
            `Received ${repos.length} repos from ${token.service_type} (page ${page}), new: ${newRepos} (${newRepoRate.toFixed(1)}%), duplicates: ${duplicates} (${duplicateRate.toFixed(1)}%), low-yield streak: ${lowYieldPages}, total unique: ${allRepos.length}`
          );

          // Check if we should continue fetching
          // Stop if: 3+ consecutive low-yield pages OR all repos are duplicates OR duplicate rate > 95% OR we got fewer repos than requested OR is_last_page is true OR repos is empty
          const tooManyLowYieldPages = lowYieldPages >= 3;
          const veryHighDuplicateRate = duplicateRate > 95;
          if (
            fetchAll &&
            repos.length > 0 &&
            newRepos > 0 &&
            !tooManyLowYieldPages &&
            !veryHighDuplicateRate &&
            repos.length === 1000 &&
            response.is_last_page !== true
          ) {
            page++;
          } else {
            hasMore = false;
            if (newRepos === 0 && repos.length > 0) {
              console.log(
                `Stopping pagination: all ${repos.length} repos are duplicates, total unique: ${allRepos.length}`
              );
            } else if (tooManyLowYieldPages) {
              console.log(
                `Stopping pagination: too many low-yield pages (${lowYieldPages} consecutive pages with <10% new repos), total unique: ${allRepos.length}`
              );
            } else if (veryHighDuplicateRate) {
              console.log(
                `Stopping pagination: very high duplicate rate (${duplicateRate.toFixed(1)}%), total unique: ${allRepos.length}`
              );
            } else if (repos.length < 1000) {
              console.log(
                `Stopping pagination: received ${repos.length} < 1000 repos (last page), total unique: ${allRepos.length}`
              );
            } else if (response.is_last_page) {
              console.log(
                `Stopping pagination: is_last_page=true, total unique: ${allRepos.length}`
              );
            } else if (repos.length === 0) {
              console.log(
                `Stopping pagination: no repos received, total unique: ${allRepos.length}`
              );
            }
          }

          // If limit is set and we've reached it, stop
          if (limit && allRepos.length >= limit) {
            hasMore = false;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch repos from ${token.service_type}:`, error);
        // Log the full error for debugging
        if (error instanceof Error) {
          console.error('Error details:', error.message);
        }
      }
    }

    return allRepos;
  },

  search: async (query: string): Promise<Repository[]> => {
    // Search is not implemented in new backend yet
    // For now, do client-side filtering
    const all = await repositoryApi.list();
    const lowerQuery = query.toLowerCase();
    return all.filter(
      repo =>
        repo.name?.toLowerCase().includes(lowerQuery) ||
        repo.fullName?.toLowerCase().includes(lowerQuery) ||
        repo.description?.toLowerCase().includes(lowerQuery)
    );
  },

  getById: async (repoId: string): Promise<Repository> => {
    // Repository ID format: provider_type:base_url:repo_id
    // For now, fetch all and find the matching one
    const all = await repositoryApi.list();
    const repo = all.find(r => r.id === repoId);
    if (!repo) {
      throw new Error(`Repository ${repoId} not found`);
    }
    return repo;
  },

  get: (id: number): Promise<Repository> => repositoryApi.getById(id.toString()),

  getTokens: (): Promise<ListResponse<ApiToken>> =>
    apiClient.request('/api/user_management/v1/tokens/'),

  createToken: (name: string): Promise<ApiToken> =>
    apiClient.request('/api/user_management/v1/tokens/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteToken: (id: number): Promise<void> =>
    apiClient.request(`/api/user_management/v1/tokens/${id}/`, {
      method: 'DELETE',
    }),

  // Favorites
  getFavorites: async (): Promise<Array<{ id: number; repository_id: string }>> => {
    return apiClient.request<Array<{ id: number; repository_id: string }>>(
      '/api/user_management/v1/favorites'
    );
  },

  addFavorite: async (repositoryId: string): Promise<{ id: number; repository_id: string }> => {
    return apiClient.request<{ id: number; repository_id: string }>(
      '/api/user_management/v1/favorites',
      {
        method: 'POST',
        body: JSON.stringify({ repository_id: repositoryId }),
      }
    );
  },

  removeFavorite: async (favoriteId: number): Promise<void> => {
    await apiClient.request(`/api/user_management/v1/favorites/${favoriteId}`, {
      method: 'DELETE',
    });
  },

  // Recent
  getRecent: async (): Promise<Array<{ id: number; repository_id: string }>> => {
    return apiClient.request<Array<{ id: number; repository_id: string }>>(
      '/api/user_management/v1/recent'
    );
  },

  // View Mode Preferences
  getViewMode: async (repositoryId: string): Promise<'developer' | 'document'> => {
    try {
      const response = await apiClient.request<{ view_mode: 'developer' | 'document' }>(
        `/api/user_management/v1/view-modes/${repositoryId}`
      );
      return response.view_mode;
    } catch (e) {
      return 'developer';
    }
  },

  setViewMode: async (repositoryId: string, viewMode: 'developer' | 'document'): Promise<void> => {
    await apiClient.request(`/api/user_management/v1/view-modes/${repositoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ view_mode: viewMode }),
    });
  },
};
