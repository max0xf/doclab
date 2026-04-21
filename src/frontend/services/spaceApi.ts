/**
 * Space API Service (v2)
 *
 * Provides access to the Space-centric API endpoints.
 * Base URL: /api/wiki/v2/spaces/
 */

import type {
  Space,
  SpacePermission,
  SpaceConfiguration,
  SpaceShortcut,
  UserSpacePreference,
  SpaceAttribute,
  SpacePermissionRole,
  SpaceVisibility,
} from '../types';

const API_BASE = '/api/wiki/v1';

// =============================================================================
// Helper Functions
// =============================================================================

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Add CSRF token for mutating requests
  const method = options?.method?.toUpperCase() || 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRFToken'] = getCsrfToken();
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// =============================================================================
// Space CRUD Operations
// =============================================================================

export interface CreateSpaceRequest {
  slug: string;
  name: string;
  description?: string;
  visibility?: SpaceVisibility;
  git_provider?: string;
  git_repository_url?: string;
  git_default_branch?: string;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
  visibility?: SpaceVisibility;
  git_provider?: string;
  git_repository_url?: string;
  git_default_branch?: string;
  // Edit fork configuration
  edit_fork_project_key?: string;
  edit_fork_repo_slug?: string;
  edit_fork_ssh_url?: string;
  edit_fork_local_path?: string;
}

/**
 * List all accessible spaces
 */
export async function listSpaces(): Promise<Space[]> {
  return fetchApi<Space[]>(`${API_BASE}/spaces/`);
}

/**
 * Get space details by slug
 */
export async function getSpace(slug: string): Promise<Space> {
  return fetchApi<Space>(`${API_BASE}/spaces/${slug}/`);
}

/**
 * Create a new space
 */
export async function createSpace(data: CreateSpaceRequest): Promise<Space> {
  return fetchApi<Space>(`${API_BASE}/spaces/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a space
 */
export async function updateSpace(slug: string, data: UpdateSpaceRequest): Promise<Space> {
  return fetchApi<Space>(`${API_BASE}/spaces/${slug}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a space
 */
export async function deleteSpace(slug: string): Promise<void> {
  await fetchApi<void>(`${API_BASE}/spaces/${slug}/`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Space Permissions
// =============================================================================

export interface GrantPermissionRequest {
  user: number;
  role: SpacePermissionRole;
}

/**
 * List permissions for a space
 */
export async function listPermissions(spaceSlug: string): Promise<SpacePermission[]> {
  return fetchApi<SpacePermission[]>(`${API_BASE}/spaces/${spaceSlug}/permissions/`);
}

/**
 * Grant permission to a user
 */
export async function grantPermission(
  spaceSlug: string,
  data: GrantPermissionRequest
): Promise<SpacePermission> {
  return fetchApi<SpacePermission>(`${API_BASE}/spaces/${spaceSlug}/permissions/grant/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Revoke permission from a user
 */
export async function revokePermission(spaceSlug: string, userId: number): Promise<void> {
  await fetchApi<void>(`${API_BASE}/spaces/${spaceSlug}/permissions/revoke/${userId}/`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Space Configuration
// =============================================================================

export interface UpdateConfigurationRequest {
  fileTreeConfig?: SpaceConfiguration['fileTreeConfig'];
  pageDisplayConfig?: SpaceConfiguration['pageDisplayConfig'];
  syncConfig?: SpaceConfiguration['syncConfig'];
  customSettings?: Record<string, any>;
}

/**
 * Get space configuration
 */
export async function getConfiguration(spaceSlug: string): Promise<SpaceConfiguration> {
  return fetchApi<SpaceConfiguration>(`${API_BASE}/spaces/${spaceSlug}/configuration/`);
}

/**
 * Update space configuration
 */
export async function updateConfiguration(
  spaceSlug: string,
  data: UpdateConfigurationRequest
): Promise<SpaceConfiguration> {
  return fetchApi<SpaceConfiguration>(`${API_BASE}/spaces/${spaceSlug}/configuration/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// =============================================================================
// Space Shortcuts
// =============================================================================

export interface CreateShortcutRequest {
  pageId: number;
  label: string;
  order?: number;
}

/**
 * List shortcuts for a space
 */
export async function listShortcuts(spaceSlug: string): Promise<SpaceShortcut[]> {
  return fetchApi<SpaceShortcut[]>(`${API_BASE}/spaces/${spaceSlug}/shortcuts/`);
}

/**
 * Create a shortcut
 */
export async function createShortcut(
  spaceSlug: string,
  data: CreateShortcutRequest
): Promise<SpaceShortcut> {
  return fetchApi<SpaceShortcut>(`${API_BASE}/spaces/${spaceSlug}/shortcuts/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a shortcut
 */
export async function deleteShortcut(spaceSlug: string, shortcutId: number): Promise<void> {
  await fetchApi<void>(`${API_BASE}/spaces/${spaceSlug}/shortcuts/${shortcutId}/`, {
    method: 'DELETE',
  });
}

// =============================================================================
// Space Attributes (EAV Pattern)
// =============================================================================

export interface CreateAttributeRequest {
  fieldId: string;
  fieldName: string;
  fieldValueStr?: string;
  fieldValueInt?: number;
  fieldValueFloat?: number;
  dataSource?: string;
}

export interface ListAttributesParams {
  fieldId?: string;
  dataSource?: string;
}

/**
 * List attributes for a space (latest versions)
 */
export async function listAttributes(
  spaceSlug: string,
  params?: ListAttributesParams
): Promise<SpaceAttribute[]> {
  const queryParams = new URLSearchParams();
  if (params?.fieldId) {
    queryParams.append('field_id', params.fieldId);
  }
  if (params?.dataSource) {
    queryParams.append('data_source', params.dataSource);
  }

  const url = `${API_BASE}/spaces/${spaceSlug}/attributes/${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  return fetchApi<SpaceAttribute[]>(url);
}

/**
 * Create or update an attribute
 */
export async function createAttribute(
  spaceSlug: string,
  data: CreateAttributeRequest
): Promise<SpaceAttribute> {
  return fetchApi<SpaceAttribute>(`${API_BASE}/spaces/${spaceSlug}/attributes/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get a specific attribute (latest version)
 */
export async function getAttribute(spaceSlug: string, fieldId: string): Promise<SpaceAttribute> {
  return fetchApi<SpaceAttribute>(`${API_BASE}/spaces/${spaceSlug}/attributes/${fieldId}/`);
}

/**
 * Get attribute history (all versions)
 */
export async function getAttributeHistory(
  spaceSlug: string,
  fieldId: string
): Promise<SpaceAttribute[]> {
  return fetchApi<SpaceAttribute[]>(
    `${API_BASE}/spaces/${spaceSlug}/attributes/${fieldId}/history/`
  );
}

/**
 * Delete an attribute (all versions)
 */
export async function deleteAttribute(spaceSlug: string, fieldId: string): Promise<void> {
  await fetchApi<void>(`${API_BASE}/spaces/${spaceSlug}/attributes/${fieldId}/`, {
    method: 'DELETE',
  });
}

// =============================================================================
// User Preferences
// =============================================================================

/**
 * List favorite spaces
 */
export async function listFavorites(): Promise<UserSpacePreference[]> {
  return fetchApi<UserSpacePreference[]>(`${API_BASE}/preferences/favorites/`);
}

/**
 * Add space to favorites
 */
export async function addToFavorites(spaceSlug: string): Promise<UserSpacePreference> {
  return fetchApi<UserSpacePreference>(`${API_BASE}/preferences/favorites/${spaceSlug}/`, {
    method: 'POST',
  });
}

/**
 * Remove space from favorites
 */
export async function removeFromFavorites(spaceSlug: string): Promise<void> {
  await fetchApi<void>(`${API_BASE}/preferences/favorites/${spaceSlug}/`, {
    method: 'DELETE',
  });
}

/**
 * List recent spaces
 */
export async function listRecent(limit: number = 10): Promise<UserSpacePreference[]> {
  return fetchApi<UserSpacePreference[]>(`${API_BASE}/preferences/recent/?limit=${limit}`);
}

/**
 * Mark space as visited (for recent tracking)
 */
export async function markVisited(spaceSlug: string): Promise<UserSpacePreference> {
  return fetchApi<UserSpacePreference>(`${API_BASE}/preferences/visited/${spaceSlug}/`, {
    method: 'POST',
  });
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Toggle favorite status for a space
 */
export async function toggleFavorite(
  spaceSlug: string,
  isFavorite: boolean
): Promise<UserSpacePreference | void> {
  if (isFavorite) {
    return removeFromFavorites(spaceSlug);
  } else {
    return addToFavorites(spaceSlug);
  }
}

/**
 * Get spaces grouped by favorites and recent
 */
export async function getMySpaces(): Promise<{
  favorites: UserSpacePreference[];
  recent: UserSpacePreference[];
  all: Space[];
}> {
  const [favorites, recent, all] = await Promise.all([
    listFavorites(),
    listRecent(10),
    listSpaces(),
  ]);

  return { favorites, recent, all };
}

/**
 * Get complete space details including configuration and permissions
 */
export async function getSpaceDetails(spaceSlug: string): Promise<{
  space: Space;
  configuration: SpaceConfiguration;
  permissions: SpacePermission[];
  shortcuts: SpaceShortcut[];
}> {
  const [space, configuration, permissions, shortcuts] = await Promise.all([
    getSpace(spaceSlug),
    getConfiguration(spaceSlug).catch(() => null),
    listPermissions(spaceSlug).catch(() => []),
    listShortcuts(spaceSlug).catch(() => []),
  ]);

  return {
    space,
    configuration: configuration!,
    permissions,
    shortcuts,
  };
}

// =============================================================================
// Export all functions
// =============================================================================

const spaceApi = {
  // CRUD
  listSpaces,
  getSpace,
  createSpace,
  updateSpace,
  deleteSpace,

  // Permissions
  listPermissions,
  grantPermission,
  revokePermission,

  // Configuration
  getConfiguration,
  updateConfiguration,

  // Shortcuts
  listShortcuts,
  createShortcut,
  deleteShortcut,

  // Attributes
  listAttributes,
  createAttribute,
  getAttribute,
  getAttributeHistory,
  deleteAttribute,

  // Preferences
  listFavorites,
  addToFavorites,
  removeFromFavorites,
  listRecent,
  markVisited,
  toggleFavorite,

  // Convenience
  getMySpaces,
  getSpaceDetails,
};

export default spaceApi;
