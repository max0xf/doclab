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
        const params = new URLSearchParams({
          provider: token.service_type,
          base_url: token.base_url || '',
          page: '1',
          per_page: limit ? limit.toString() : '100',
        });

        const response = await apiClient.request<ListResponse<Repository>>(
          `/api/git-provider/v1/repositories/?${params.toString()}`
        );
        allRepos.push(...(response.items || []));
      } catch (error) {
        console.error(`Failed to fetch repos from ${token.service_type}:`, error);
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
