import { apiClient } from './apiClient';

const API_BASE = '/api/service-tokens/v1';

export interface ServiceToken {
  id: string; // UUID
  service_type: 'github' | 'bitbucket_server' | 'jira' | 'custom_header';
  base_url: string;
  username?: string;
  header_name?: string;
  name?: string;
  has_token: boolean; // Indicates if token is configured (without exposing the actual token)
  created_at: string;
  updated_at: string;
}

export interface ServiceTokenCreate {
  service_type: 'github' | 'bitbucket_server' | 'jira' | 'custom_header';
  base_url?: string;
  token?: string;
  username?: string;
  header_name?: string;
  name?: string;
}

export const serviceTokensApi = {
  /**
   * List all service tokens for the current user
   */
  list: async (): Promise<ServiceToken[]> => {
    return apiClient.request<ServiceToken[]>(`${API_BASE}/tokens/`);
  },

  /**
   * Create or update a service token
   */
  save: async (data: ServiceTokenCreate): Promise<ServiceToken> => {
    return apiClient.request<ServiceToken>(`${API_BASE}/tokens/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a service token
   */
  delete: async (serviceType: string, baseUrl: string = ''): Promise<void> => {
    const params = new URLSearchParams({ service_type: serviceType });
    if (baseUrl) {
      params.append('base_url', baseUrl);
    }
    return apiClient.request(`${API_BASE}/tokens/?${params.toString()}`, {
      method: 'DELETE',
    });
  },
};
