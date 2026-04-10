import { apiClient } from './apiClient';

export interface ApiToken {
  id: number;
  name: string;
  token?: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}

export interface ApiTokenCreate {
  name: string;
  expires_in_days?: number;
}

export const apiTokensApi = {
  /**
   * List all API tokens for the current user
   */
  list: async (): Promise<ApiToken[]> => {
    return apiClient.request<ApiToken[]>('/api/user_management/v1/tokens');
  },

  /**
   * Create a new API token
   */
  create: async (data: ApiTokenCreate): Promise<ApiToken> => {
    return apiClient.request<ApiToken>('/api/user_management/v1/tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an API token
   */
  delete: async (id: number): Promise<void> => {
    return apiClient.request(`/api/user_management/v1/tokens/${id}`, {
      method: 'DELETE',
    });
  },
};
