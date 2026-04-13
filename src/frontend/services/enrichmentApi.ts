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
  id: number;
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

export interface PREnrichment extends Enrichment {
  type: 'pr_diff';
  pr_number: number;
  pr_title: string;
  pr_author: string;
  pr_state: string;
  pr_url: string;
  created_at: string;
}

export interface EnrichmentsResponse {
  comments?: CommentEnrichment[];
  diff?: DiffEnrichment[];
  local_changes?: LocalChangeEnrichment[];
  pr_diff?: PREnrichment[];
}

export interface EnrichmentTypesResponse {
  types: string[];
}

/**
 * Get all enrichments for a source URI.
 */
export async function getEnrichments(sourceUri: string): Promise<EnrichmentsResponse> {
  const response = await apiClient.request<EnrichmentsResponse>(
    `/api/enrichments/v1/enrichments/?source_uri=${encodeURIComponent(sourceUri)}`
  );
  return response;
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
 */
export function buildSourceUri(
  gitProvider: string,
  baseUrl: string,
  projectKey: string,
  repoSlug: string,
  branch: string,
  filePath: string
): string {
  return `git://${gitProvider}/${baseUrl}/${projectKey}/${repoSlug}/${branch}/${filePath}`;
}

export const enrichmentApi = {
  getEnrichments,
  getEnrichmentsByType,
  getEnrichmentTypes,
  buildSourceUri,
};
