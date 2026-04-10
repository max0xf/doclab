import { apiClient } from './apiClient';
import { serviceTokensApi } from './serviceTokensApi';

/**
 * Helper to get provider info for a repository
 * Since repo IDs don't encode provider info, we need to find it from service tokens
 */
async function getProviderForRepo(repoId: string): Promise<{
  provider: string;
  base_url: string;
} | null> {
  const tokens = await serviceTokensApi.list();
  const gitTokens = tokens.filter(
    t => t.service_type === 'github' || t.service_type === 'bitbucket_server'
  );

  // For now, try each provider until we find the repo
  // This is inefficient but works until we have better repo ID encoding
  for (const token of gitTokens) {
    try {
      const params = new URLSearchParams({
        provider: token.service_type,
        base_url: token.base_url || '',
      });

      const response = await apiClient.request<any>(
        `/api/git-provider/v1/repositories/${repoId}/?${params.toString()}`
      );

      if (response) {
        return {
          provider: token.service_type,
          base_url: token.base_url || '',
        };
      }
    } catch {
      // Try next provider
      continue;
    }
  }

  return null;
}

export const gitProviderApi = {
  /**
   * Get file content from a repository
   */
  getFileContent: async (
    repoId: string,
    filePath: string,
    branch: string = 'main'
  ): Promise<any> => {
    const providerInfo = await getProviderForRepo(repoId);
    if (!providerInfo) {
      throw new Error('Provider not found for repository');
    }

    const params = new URLSearchParams({
      provider: providerInfo.provider,
      base_url: providerInfo.base_url,
      path: filePath,
      branch,
    });

    return apiClient.request(
      `/api/git-provider/v1/repositories/${repoId}/files/${encodeURIComponent(filePath)}?${params.toString()}`
    );
  },

  /**
   * Get directory tree for a repository
   */
  getDirectoryTree: async (
    repoId: string,
    path: string = '',
    branch: string = 'main',
    recursive: boolean = false
  ): Promise<any> => {
    const providerInfo = await getProviderForRepo(repoId);
    if (!providerInfo) {
      throw new Error('Provider not found for repository');
    }

    const params = new URLSearchParams({
      provider: providerInfo.provider,
      base_url: providerInfo.base_url,
      branch,
      recursive: recursive.toString(),
    });

    if (path) {
      params.append('path', path);
    }

    return apiClient.request(
      `/api/git-provider/v1/repositories/${repoId}/tree?${params.toString()}`
    );
  },

  /**
   * List branches for a repository
   */
  listBranches: async (repoId: string): Promise<string[]> => {
    const providerInfo = await getProviderForRepo(repoId);
    if (!providerInfo) {
      throw new Error('Provider not found for repository');
    }

    const params = new URLSearchParams({
      provider: providerInfo.provider,
      base_url: providerInfo.base_url,
    });

    const response = await apiClient.request<{ items: Array<{ name: string }> }>(
      `/api/git-provider/v1/repositories/${repoId}/branches?${params.toString()}`
    );

    return response.items.map(b => b.name);
  },

  /**
   * Get repository details
   */
  getRepository: async (repoId: string): Promise<any> => {
    const providerInfo = await getProviderForRepo(repoId);
    if (!providerInfo) {
      throw new Error('Provider not found for repository');
    }

    const params = new URLSearchParams({
      provider: providerInfo.provider,
      base_url: providerInfo.base_url,
    });

    return apiClient.request(`/api/git-provider/v1/repositories/${repoId}/?${params.toString()}`);
  },
};
