/**
 * Source Provider API Client
 *
 * Provides access to source data (files, content, metadata, history)
 * from various providers (git, local, database, etc.)
 */

import { apiClient } from './apiClient';

const API_BASE = '/api/source/v1';

// Types

export interface SourceAddress {
  provider_type: string;
  provider_id: string;
  resource_path: string;
  version: string;
  uri: string;
}

export interface SourceProvider {
  type: string;
  id: string;
  name: string;
  metadata: Record<string, any>;
}

export interface SourceResource {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'repository';
  path: string;
  size: number | null;
  metadata: Record<string, any>;
}

export interface SourceMetadata {
  size: number;
  content_type: string | null;
  encoding: string | null;
  sha: string | null;
  author: string | null;
  modified_at: string | null;
  created_at: string | null;
  extra: Record<string, any>;
}

export interface SourceContent {
  address: SourceAddress;
  content: string;
  content_type: string;
  encoding: string;
  metadata: SourceMetadata;
}

export interface SourceVersion {
  version: string;
  author: string;
  date: string;
  message: string;
  metadata: Record<string, any>;
}

// API Functions

/**
 * List available source providers
 */
export async function listSourceProviders(): Promise<SourceProvider[]> {
  const response = await apiClient.request<{ items: SourceProvider[] }>(`${API_BASE}/providers/`);
  return response.items;
}

/**
 * List resources at a path
 */
export async function listResources(
  providerType: string,
  providerId: string,
  path: string = '',
  version: string = 'HEAD'
): Promise<SourceResource[]> {
  const params = new URLSearchParams();
  if (path) {
    params.append('path', path);
  }
  if (version) {
    params.append('version', version);
  }

  const url = `${API_BASE}/${providerType}/${providerId}/resources/?${params.toString()}`;
  const response = await apiClient.request<{ items: SourceResource[] }>(url);
  return response.items;
}

/**
 * Get file content
 */
export async function getContent(
  providerType: string,
  providerId: string,
  resourcePath: string,
  version: string = 'HEAD'
): Promise<SourceContent> {
  const params = new URLSearchParams({ version });
  const url = `${API_BASE}/${providerType}/${providerId}/content/${resourcePath}?${params.toString()}`;
  return apiClient.request<SourceContent>(url);
}

/**
 * Get metadata without fetching content
 */
export async function getMetadata(
  providerType: string,
  providerId: string,
  resourcePath: string,
  version: string = 'HEAD'
): Promise<SourceMetadata> {
  const params = new URLSearchParams({ version });
  const url = `${API_BASE}/${providerType}/${providerId}/metadata/${resourcePath}?${params.toString()}`;
  return apiClient.request<SourceMetadata>(url);
}

/**
 * Get version history
 */
export async function getHistory(
  providerType: string,
  providerId: string,
  resourcePath: string,
  limit: number = 50
): Promise<SourceVersion[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  const url = `${API_BASE}/${providerType}/${providerId}/history/${resourcePath}?${params.toString()}`;
  const response = await apiClient.request<{ items: SourceVersion[] }>(url);
  return response.items;
}

/**
 * Parse source URI into components
 */
export function parseSourceUri(uri: string): {
  provider_type: string;
  provider_id: string;
  resource_path: string;
  version: string;
} {
  // Format: source://provider_type/provider_id/resource_path@version
  if (!uri.startsWith('source://')) {
    throw new Error(`Invalid source URI: ${uri}`);
  }

  const withoutScheme = uri.substring(9); // Remove 'source://'
  const [pathPart, version] = withoutScheme.split('@');

  if (!version) {
    throw new Error(`Invalid source URI (missing version): ${uri}`);
  }

  const parts = pathPart.split('/');
  if (parts.length < 3) {
    throw new Error(`Invalid source URI (missing components): ${uri}`);
  }

  const provider_type = decodeURIComponent(parts[0]);
  const provider_id = decodeURIComponent(parts[1]);
  const resource_path = parts.slice(2).map(decodeURIComponent).join('/');

  return {
    provider_type,
    provider_id,
    resource_path,
    version: decodeURIComponent(version),
  };
}

/**
 * Build source URI from components
 */
export function buildSourceUri(
  providerType: string,
  providerId: string,
  resourcePath: string,
  version: string
): string {
  const encodedType = encodeURIComponent(providerType);
  const encodedId = encodeURIComponent(providerId);
  const encodedPath = resourcePath.split('/').map(encodeURIComponent).join('/');
  const encodedVersion = encodeURIComponent(version);

  return `source://${encodedType}/${encodedId}/${encodedPath}@${encodedVersion}`;
}

/**
 * Get content by source URI
 */
export async function getContentByUri(sourceUri: string): Promise<SourceContent> {
  const { provider_type, provider_id, resource_path, version } = parseSourceUri(sourceUri);
  return getContent(provider_type, provider_id, resource_path, version);
}
