/**
 * Enrichment API service for fetching enrichments from the backend.
 */
import { apiClient } from './apiClient';

export interface Enrichment {
  type: string;
  id: string | number;
  [key: string]: any;
}

export interface CommentEnrichment extends Enrichment {
  type: 'comment';
  id: string; // UUID
  source_uri: string;
  line_start: number;
  line_end: number;
  text: string;
  author: string;
  thread_id: string;
  is_resolved: boolean;
  anchoring_status: string;
  created_at: string;
  updated_at: string;
}

export interface DiffEnrichment extends Enrichment {
  type: 'diff';
  id: string;
  file_path: string;
  description: string;
  status: string;
  diff_hunks: DiffHunk[];
  diff_text: string;
  created_at: string;
  updated_at: string;
  stats: {
    additions: number;
    deletions: number;
    total_changes: number;
  };
}

export interface DiffHunk {
  old_start: number;
  old_count: number;
  new_start: number;
  new_count: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
}

export interface LocalChangeEnrichment extends Enrichment {
  type: 'local_change';
  id: number;
  file_path: string;
  commit_message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PRDiffHunk {
  old_start: number;
  old_count: number;
  new_start: number;
  new_count: number;
  lines: string[];
}

export interface PREnrichment extends Enrichment {
  type: 'pr_diff';
  pr_number: number;
  pr_title: string;
  pr_author: string;
  pr_state: string;
  pr_url: string;
  created_at: string;
  diff_hunks?: PRDiffHunk[];
}

/**
 * Edit enrichment - user's edits stored in DocLab.
 * Not yet committed to git.
 * Actions: stage, discard
 */
export interface EditEnrichment extends Enrichment {
  type: 'edit';
  id: string;
  space_id: string;
  space_slug: string;
  file_path: string;
  change_type: 'modify' | 'create' | 'delete';
  description: string;
  user: string;
  user_full_name: string;
  created_at: string;
  updated_at: string;
  diff_hunks?: PRDiffHunk[];
  actions: ('commit' | 'discard')[];
}

/**
 * Commit enrichment - commits in user's fork branch not yet in main repo.
 * Actions: unstage, create_pr (or view_pr if PR already exists)
 */
export interface CommitEnrichment extends Enrichment {
  type: 'commit';
  id: string;
  space_id: string;
  space_slug: string;
  file_path: string;
  branch_name: string;
  base_branch: string;
  task_name?: string | null;
  commit_sha: string | null;
  user: string;
  user_full_name: string;
  created_at: string;
  updated_at: string;
  diff_hunks?: PRDiffHunk[];
  additions?: number;
  deletions?: number;
  pr_id?: number | null;
  pr_url?: string | null;
  actions: ('unstage' | 'create_pr' | 'view_pr')[];
}

export interface EnrichmentsResponse {
  comments?: CommentEnrichment[];
  diff?: DiffEnrichment[];
  local_changes?: LocalChangeEnrichment[];
  pr_diff?: PREnrichment[];
  edit?: EditEnrichment[];
  commit?: CommitEnrichment[];
}

export interface EnrichmentTypesResponse {
  types: string[];
}

/**
 * Get all enrichments for a source URI.
 */
export async function getEnrichments(
  sourceUri: string,
  recursive: boolean = false
): Promise<EnrichmentsResponse | Record<string, EnrichmentsResponse>> {
  const params = new URLSearchParams({
    source_uri: sourceUri,
    ...(recursive && { recursive: 'true' }),
  });

  const response = await apiClient.request<
    EnrichmentsResponse | Record<string, EnrichmentsResponse>
  >(`/api/enrichments/v1/enrichments/?${params.toString()}`);
  return response;
}

/**
 * Stream enrichments for a source URI.
 * Fires `onProgress(message)` for each progress event from the backend,
 * then resolves with the final EnrichmentsResponse.
 */
export async function streamEnrichments(
  sourceUri: string,
  onProgress?: (message: string) => void
): Promise<EnrichmentsResponse> {
  const params = new URLSearchParams({ source_uri: sourceUri });
  const url = `/api/enrichments/v1/enrichments/stream/?${params.toString()}`;

  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok || !response.body) {
    throw new Error(`Enrichment stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: EnrichmentsResponse = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (!line) {
          continue;
        }
        try {
          const event = JSON.parse(line) as { type: string; message?: string; data?: any };
          if (event.type === 'progress' && event.message) {
            onProgress?.(event.message);
          } else if (event.type === 'complete' && event.data) {
            result = event.data as EnrichmentsResponse;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
}

/**
 * Get enrichments of a specific type for a source URI.
 */
export async function getEnrichmentsByType(
  sourceUri: string,
  type: string
): Promise<EnrichmentsResponse> {
  const response = await apiClient.request<EnrichmentsResponse>(
    `/api/enrichments/v1/enrichments/?source_uri=${encodeURIComponent(sourceUri)}&type=${type}`
  );
  return response;
}

/**
 * Get list of available enrichment types.
 */
export async function getEnrichmentTypes(): Promise<string[]> {
  const response = await apiClient.request<EnrichmentTypesResponse>(
    '/api/enrichments/v1/enrichments/types/'
  );
  return response.types;
}

/**
 * Build source URI from space and file information.
 * Format: git://{provider}/{repository}/{branch}/{path}
 * Repository format for Bitbucket: {projectKey}_{repoSlug}
 */
export function buildSourceUri(
  gitProvider: string,
  _baseUrl: string,
  projectKey: string,
  repoSlug: string,
  branch: string,
  filePath: string
): string {
  // Build repository identifier as projectKey_repoSlug for Bitbucket
  const repository = `${projectKey}_${repoSlug}`;

  // Format: git://{provider}/{repository}/{branch}/{path}
  return `git://${gitProvider}/${repository}/${branch}/${filePath}`;
}

export const enrichmentApi = {
  getEnrichments,
  getEnrichmentsByType,
  getEnrichmentTypes,
  buildSourceUri,
};
