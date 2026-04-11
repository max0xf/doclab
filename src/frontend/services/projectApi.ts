import { apiClient } from './apiClient';

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  public: boolean;
  type: string;
}

export const projectApi = {
  // List projects from configured git provider
  list: async (provider: string, baseUrl: string): Promise<Project[]> => {
    const allProjects: Project[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        provider,
        base_url: baseUrl,
        page: page.toString(),
        per_page: '100',
      });

      console.log(`Fetching projects page ${page}`);

      const response = await apiClient.request<{
        projects: Project[];
        is_last_page?: boolean;
      }>(`/api/git-provider/v1/repositories/projects/?${params.toString()}`);

      const projects = response.projects || [];
      console.log(`Received ${projects.length} projects (page ${page})`);
      allProjects.push(...projects);

      if (projects.length < 100 || response.is_last_page) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allProjects;
  },

  // List repositories for a specific project
  listRepositories: async (
    provider: string,
    baseUrl: string,
    projectKey: string
  ): Promise<any[]> => {
    const allRepos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        provider,
        base_url: baseUrl,
        project_key: projectKey,
        page: page.toString(),
        per_page: '100',
      });

      console.log(`Fetching repos for project ${projectKey}, page ${page}`);

      const response = await apiClient.request<{
        repositories: any[];
        is_last_page?: boolean;
      }>(`/api/git-provider/v1/repositories/repositories/?${params.toString()}`);

      const repos = response.repositories || [];
      console.log(`Received ${repos.length} repos for ${projectKey} (page ${page})`);
      allRepos.push(...repos);

      if (repos.length < 100 || response.is_last_page) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allRepos;
  },
};
