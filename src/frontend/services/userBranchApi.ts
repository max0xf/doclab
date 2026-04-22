import { apiClient } from './apiClient';

const API_BASE = '/api/wiki/v1';

export interface UserBranchInfo {
  id: string;
  branch_name: string;
  base_branch: string;
  status: 'active' | 'pr_open' | 'abandoned';
  last_commit_sha: string | null;
  pr_id: string | null;
  pr_url: string | null;
  conflict_files: string[];
  files_count: number;
  files: string[];
  created_at: string;
  updated_at: string;
}

export interface BranchStatusResponse {
  draft_count: number;
  branch: UserBranchInfo | null;
  edit_enabled: boolean;
}

export interface CreatePrResult {
  pr_id: string;
  pr_url: string;
  branch_name: string;
}

export interface RebaseConflictError {
  error: 'rebase_conflict';
  conflict_files: string[];
}

export async function getBranchStatus(spaceId: string): Promise<BranchStatusResponse> {
  return apiClient.request<BranchStatusResponse>(
    `${API_BASE}/user-branch/status/?space_id=${encodeURIComponent(spaceId)}`
  );
}

export async function createPullRequest(
  spaceId: string,
  title?: string,
  description?: string
): Promise<CreatePrResult> {
  return apiClient.request<CreatePrResult>(`${API_BASE}/user-branch/create-pr/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, title, description }),
  });
}

export async function discardBranch(
  spaceId: string
): Promise<{ discarded: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/discard/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId }),
  });
}

export async function unstageBranch(
  spaceId: string
): Promise<{ unstaged_files: string[]; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/unstage/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId }),
  });
}

export async function rebaseBranch(
  spaceId: string
): Promise<{ rebased: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/rebase/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId }),
  });
}
