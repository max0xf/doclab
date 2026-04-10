import { apiClient } from './apiClient';
import { User } from '../types';

export const authApi = {
  me: (): Promise<User> => apiClient.request('/api/auth/v1/me'),

  login: (username: string, password: string): Promise<{ user: User; token: string }> =>
    apiClient.request('/api/auth/v1/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: (): Promise<void> => apiClient.request('/api/auth/v1/logout', { method: 'POST' }),
};
