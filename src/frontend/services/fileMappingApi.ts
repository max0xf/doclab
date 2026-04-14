import { apiClient } from './apiClient';

export interface FileMapping {
  id: string;
  space: string;
  space_slug: string;
  file_path: string;
  is_folder: boolean;
  is_visible: boolean;
  display_name: string | null;
  display_name_source: 'custom' | 'filename' | 'first_h1' | 'first_h2' | 'title_frontmatter';
  children_display_name_source: string | null;
  extracted_name: string | null;
  extracted_at: string | null;
  effective_display_name: string;
  effective_display_name_source: string | null;
  effective_is_visible: boolean;
  sort_order: number | null;
  icon: string | null;
  apply_to_children: boolean;
  parent_rule: string | null;
  is_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileMappingCreate {
  file_path: string;
  is_folder: boolean;
  is_visible: boolean;
  display_name?: string | null;
  display_name_source: 'custom' | 'filename' | 'first_h1' | 'first_h2' | 'title_frontmatter';
  sort_order?: number | null;
  icon?: string | null;
  apply_to_children?: boolean;
  is_override?: boolean;
}

export interface FileTreeNode {
  path: string;
  name?: string;
  type: 'file' | 'dir';
  is_visible?: boolean;
  display_name?: string;
  display_name_source?: string;
  extracted_name?: string;
  icon?: string;
  sort_order?: number;
  has_mapping?: boolean;
  filtered?: boolean;
  children?: FileTreeNode[];
}

export interface ExtractedName {
  file_path: string;
  extracted_name: string;
  source: string;
  error?: string;
}

export const fileMappingApi = {
  /**
   * List all file mappings for a space
   */
  list: async (spaceSlug: string): Promise<FileMapping[]> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/`);
  },

  /**
   * Create a new file mapping
   */
  create: async (spaceSlug: string, data: FileMappingCreate): Promise<FileMapping> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a file mapping
   */
  update: async (
    spaceSlug: string,
    id: string,
    data: Partial<FileMappingCreate>
  ): Promise<FileMapping> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a file mapping
   */
  delete: async (spaceSlug: string, id: string): Promise<void> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/${id}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Bulk update file mappings
   */
  bulkUpdate: async (spaceSlug: string, mappings: FileMappingCreate[]): Promise<FileMapping[]> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/bulk_update/`, {
      method: 'POST',
      body: JSON.stringify({ mappings }),
    });
  },

  /**
   * Apply a folder rule
   */
  applyFolderRule: async (
    spaceSlug: string,
    folderPath: string,
    rule: Partial<FileMappingCreate>,
    applyToChildren: boolean = true
  ): Promise<FileMapping> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/apply_folder_rule/`, {
      method: 'POST',
      body: JSON.stringify({
        folder_path: folderPath,
        apply_to_children: applyToChildren,
        rule,
      }),
    });
  },

  /**
   * Extract display names from files
   */
  extractNames: async (
    spaceSlug: string,
    filePaths: string[],
    source: 'first_h1' | 'first_h2' | 'title_frontmatter' | 'filename'
  ): Promise<{ extracted: ExtractedName[] }> => {
    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/extract_names/`, {
      method: 'POST',
      body: JSON.stringify({
        file_paths: filePaths,
        source,
      }),
    });
  },

  /**
   * Get file tree with mappings applied
   */
  getTree: async (
    spaceSlug: string,
    mode: 'dev' | 'documents' = 'dev',
    filters?: string[],
    path?: string
  ): Promise<{ tree: FileTreeNode[] }> => {
    const params = new URLSearchParams({ mode });
    if (filters && filters.length > 0) {
      params.append('filters', filters.join(','));
    }
    if (path) {
      params.append('path', path);
    }

    return apiClient.request(`/api/wiki/v1/spaces/${spaceSlug}/file-mappings/get_tree/?${params}`);
  },
};
