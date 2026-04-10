/**
 * API service for user changes (pending edits).
 */

export interface UserChangeData {
  id: number;
  modified_content: string;
  diff_hunks: DiffHunk[];
  created_at: string;
  updated_at: string;
  status: 'added' | 'committed' | 'rejected';
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: Array<{
    type: 'add' | 'delete' | 'context';
    content: string;
  }>;
}

/**
 * Get user's pending changes for a file
 */
export async function getUserChanges(
  repositoryFullName: string,
  filePath: string
): Promise<UserChangeData | null> {
  const encodedRepo = encodeURIComponent(repositoryFullName);
  const encodedPath = encodeURIComponent(filePath);

  const response = await fetch(`/api/wiki/user-changes/${encodedRepo}/${encodedPath}/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get user changes: ${response.statusText}`);
  }

  const data = await response.json();
  return data.user_change;
}

/**
 * Save user changes (autosave)
 */
export async function saveUserChanges(
  repositoryFullName: string,
  filePath: string,
  originalContent: string,
  modifiedContent: string
): Promise<UserChangeData> {
  const encodedRepo = encodeURIComponent(repositoryFullName);
  const encodedPath = encodeURIComponent(filePath);

  const response = await fetch(`/api/wiki/user-changes/${encodedRepo}/${encodedPath}/save/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      original_content: originalContent,
      modified_content: modifiedContent,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save user changes: ${response.statusText}`);
  }

  const data = await response.json();
  return data.user_change;
}

/**
 * Commit user changes (mark as committed when creating PR)
 */
export async function commitUserChanges(
  repositoryFullName: string,
  filePath: string
): Promise<void> {
  const encodedRepo = encodeURIComponent(repositoryFullName);
  const encodedPath = encodeURIComponent(filePath);

  const response = await fetch(`/api/wiki/user-changes/${encodedRepo}/${encodedPath}/commit/`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to commit user changes: ${response.statusText}`);
  }
}

/**
 * Discard user changes (reset to original)
 */
export async function discardUserChanges(
  repositoryFullName: string,
  filePath: string
): Promise<void> {
  const encodedRepo = encodeURIComponent(repositoryFullName);
  const encodedPath = encodeURIComponent(filePath);

  const response = await fetch(`/api/wiki/user-changes/${encodedRepo}/${encodedPath}/discard/`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to discard user changes: ${response.statusText}`);
  }
}
