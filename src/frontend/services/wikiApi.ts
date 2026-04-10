import { apiClient } from './apiClient';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  title?: string;
  size?: number;
  children?: TreeNode[];
}

export interface RepositoryTree {
  repository_id: string;
  ref: string;
  mode: 'developer' | 'document';
  tree: TreeNode[];
}

export interface WikiConfig {
  include_paths: string[];
  extensions: string[];
  title_strategy: string;
}

export interface RepositoryConfig {
  repository_id: string;
  ref: string;
  has_config: boolean;
  config: WikiConfig;
}

export const wikiApi = {
  getRepositoryTree: async (
    repositoryId: string,
    mode: 'developer' | 'document' = 'developer',
    ref?: string,
    path?: string
  ): Promise<RepositoryTree> => {
    const params = new URLSearchParams({ mode });
    if (ref) {
      params.append('ref', ref);
    }
    if (path) {
      params.append('path', path);
    }
    const response = await apiClient.request<RepositoryTree>(
      `/api/wiki/repositories/${repositoryId}/tree/?${params.toString()}`
    );
    return response;
  },

  getRepositoryConfig: async (repositoryId: string, ref?: string): Promise<RepositoryConfig> => {
    const params = ref ? `?ref=${ref}` : '';
    const response = await apiClient.request<RepositoryConfig>(
      `/api/wiki/repositories/${repositoryId}/config/${params}`
    );
    return response;
  },
};
