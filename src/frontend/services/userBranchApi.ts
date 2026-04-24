import { apiClient } from './apiClient';

const API_BASE = '/api/wiki/v1';

export interface UserTaskInfo {
  id: string;
  name: string;
  branch_name: string;
  base_branch: string;
  status: 'active' | 'pr_open' | 'abandoned';
  is_selected: boolean;
  last_commit_sha: string | null;
  pr_id: string | null;
  pr_url: string | null;
  conflict_files: string[];
  files_count: number;
  files: string[];
  draft_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceResponse {
  tasks: UserTaskInfo[];
  selected_task_id: string | null;
  unassigned_draft_count: number;
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

// ── Workspace (all tasks) ─────────────────────────────────────────────────────

export async function getWorkspace(spaceId: string): Promise<WorkspaceResponse> {
  return apiClient.request<WorkspaceResponse>(
    `${API_BASE}/user-branch/workspace/?space_id=${encodeURIComponent(spaceId)}`
  );
}

export async function createTask(spaceId: string, name: string): Promise<UserTaskInfo> {
  return apiClient.request<UserTaskInfo>(`${API_BASE}/user-branch/create-task/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, name }),
  });
}

export async function selectTask(branchId: string): Promise<{ selected_task_id: string }> {
  return apiClient.request(`${API_BASE}/user-branch/select-task/`, {
    method: 'POST',
    body: JSON.stringify({ branch_id: branchId }),
  });
}

export async function deleteTask(
  branchId: string
): Promise<{ deleted: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/delete-task/`, {
    method: 'POST',
    body: JSON.stringify({ branch_id: branchId }),
  });
}

// ── Per-task actions (branch_id optional, defaults to selected) ───────────────

export async function createPullRequest(
  spaceId: string,
  branchId?: string,
  title?: string,
  description?: string
): Promise<CreatePrResult> {
  return apiClient.request<CreatePrResult>(`${API_BASE}/user-branch/create-pr/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, branch_id: branchId, title, description }),
  });
}

export async function discardBranch(
  spaceId: string,
  branchId?: string
): Promise<{ discarded: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/discard/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, branch_id: branchId }),
  });
}

export async function unstageBranch(
  spaceId: string,
  branchId?: string
): Promise<{ unstaged_files: string[]; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/unstage/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, branch_id: branchId }),
  });
}

export async function rebaseBranch(
  spaceId: string,
  branchId?: string
): Promise<{ rebased: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/rebase/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, branch_id: branchId }),
  });
}

export async function renameTask(branchId: string, name: string): Promise<UserTaskInfo> {
  return apiClient.request<UserTaskInfo>(`${API_BASE}/user-branch/rename-task/`, {
    method: 'POST',
    body: JSON.stringify({ branch_id: branchId, name }),
  });
}

export async function deletePr(
  spaceId: string,
  branchId?: string
): Promise<{ deleted: boolean; branch_name: string }> {
  return apiClient.request(`${API_BASE}/user-branch/delete-pr/`, {
    method: 'POST',
    body: JSON.stringify({ space_id: spaceId, branch_id: branchId }),
  });
}

// ── Legacy: kept for backward compat ─────────────────────────────────────────

/** @deprecated Use getWorkspace() instead */
export async function getBranchStatus(spaceId: string): Promise<{
  draft_count: number;
  branch: UserTaskInfo | null;
  edit_enabled: boolean;
}> {
  return apiClient.request(
    `${API_BASE}/user-branch/status/?space_id=${encodeURIComponent(spaceId)}`
  );
}

// ── Type alias for backward compat ───────────────────────────────────────────

/** @deprecated Use UserTaskInfo */
export type UserBranchInfo = UserTaskInfo;
export type BranchStatusResponse = {
  draft_count: number;
  branch: UserTaskInfo | null;
  edit_enabled: boolean;
};
