/**
 * Draft Change API
 *
 * Simple API for managing user draft changes (edits not yet committed to git).
 */
import { apiClient } from './apiClient';

const API_BASE = '/api/wiki/v1';

export interface DraftChange {
  id: string;
  space_id: string;
  space_slug: string;
  file_path: string;
  change_type: 'modify' | 'create' | 'delete';
  original_content?: string;
  modified_content?: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DraftChangeListItem {
  id: string;
  space_id: string;
  space_slug: string;
  file_path: string;
  change_type: 'modify' | 'create' | 'delete';
  description: string;
  created_at: string;
  updated_at: string;
}

/**
 * List draft changes for the current user.
 */
export async function listDraftChanges(spaceId?: string): Promise<DraftChangeListItem[]> {
  const params = spaceId ? `?space_id=${spaceId}` : '';
  return apiClient.request<DraftChangeListItem[]>(`${API_BASE}/draft-changes/${params}`);
}

/**
 * Save a draft change (create or update).
 */
export async function saveDraftChange(
  spaceId: string,
  filePath: string,
  originalContent: string,
  modifiedContent: string,
  changeType: 'modify' | 'create' | 'delete' = 'modify',
  description?: string
): Promise<{ id: string; created: boolean }> {
  return apiClient.request(`${API_BASE}/draft-changes/`, {
    method: 'POST',
    body: JSON.stringify({
      space_id: spaceId,
      file_path: filePath,
      original_content: originalContent,
      modified_content: modifiedContent,
      change_type: changeType,
      description: description || '',
    }),
  });
}

/**
 * Get a draft change by ID.
 */
export async function getDraftChange(changeId: string): Promise<DraftChange> {
  return apiClient.request<DraftChange>(`${API_BASE}/draft-changes/${changeId}/`);
}

/**
 * Discard a draft change.
 */
export async function discardDraftChange(changeId: string): Promise<void> {
  await apiClient.request<void>(`${API_BASE}/draft-changes/${changeId}/`, {
    method: 'DELETE',
  });
}

/**
 * Get draft change for a specific file (if exists).
 */
export async function getDraftChangeForFile(
  spaceId: string,
  filePath: string
): Promise<DraftChangeListItem | null> {
  const changes = await listDraftChanges(spaceId);
  return changes.find(c => c.file_path === filePath) || null;
}

export interface CommitResult {
  success: boolean;
  message?: string;
  commit_sha: string | null;
  branch_name: string;
  files_committed: number;
  space_id: string;
  space_slug: string;
}

/**
 * Commit selected draft changes to git.
 * Creates a git commit in the user's fork branch with the selected changes.
 */
export async function commitDraftChanges(
  changeIds: string[],
  commitMessage?: string
): Promise<CommitResult> {
  return apiClient.request<CommitResult>(`${API_BASE}/draft-changes/commit/`, {
    method: 'POST',
    body: JSON.stringify({
      change_ids: changeIds,
      commit_message: commitMessage,
    }),
  });
}
