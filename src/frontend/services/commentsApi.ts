import { apiClient } from './apiClient';

export interface FileComment {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  start_line: number | null;
  end_line: number | null;
  original_line_number: number | null;
  computed_line_number: number | null;
  anchoring_status: 'anchored' | 'moved' | 'outdated' | 'deleted';
  comment_text: string;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface CreateCommentParams {
  git_provider: string;
  project_key: string;
  repo_slug: string;
  branch: string;
  file_path: string;
  comment_text: string;
  start_line?: number;
  end_line?: number;
  line_content?: string;
  context_before?: string[];
  context_after?: string[];
}

export interface ListCommentsParams {
  git_provider: string;
  project_key: string;
  repo_slug: string;
  branch: string;
  file_path: string;
}

export const commentsApi = {
  list: async (params: ListCommentsParams): Promise<FileComment[]> => {
    const queryParams = new URLSearchParams({
      git_provider: params.git_provider,
      project_key: params.project_key,
      repo_slug: params.repo_slug,
      branch: params.branch,
      file_path: params.file_path,
    });

    const response = await apiClient.request<{ items: FileComment[] }>(
      `/api/wiki/file-comments/?${queryParams.toString()}`
    );
    return response.items || [];
  },

  create: async (params: CreateCommentParams): Promise<FileComment> => {
    const response = await apiClient.request<FileComment>('/api/wiki/file-comments/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response;
  },

  update: async (
    commentId: number,
    data: { comment_text?: string; status?: string }
  ): Promise<FileComment> => {
    const response = await apiClient.request<FileComment>(`/api/wiki/file-comments/${commentId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  },

  delete: async (commentId: number): Promise<void> => {
    await apiClient.request(`/api/wiki/file-comments/${commentId}/`, {
      method: 'DELETE',
    });
  },
};
