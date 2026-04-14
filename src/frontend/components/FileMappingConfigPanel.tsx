import React, { useMemo } from 'react';
import { fileMappingApi } from '../services/fileMappingApi';
import FileTree from './FileTree';
import type { FileMapping } from '../services/fileMappingApi';
import type { Space } from '../types';

interface FileMappingConfigPanelProps {
  space: Space;
  mappings: Map<string, FileMapping>;
  filters: string[];
  onMappingChange: () => void;
}

export default function FileMappingConfigPanel({
  space,
  mappings,
  filters,
  onMappingChange,
}: FileMappingConfigPanelProps) {
  const handleToggleVisibility = async (path: string, currentValue: boolean) => {
    try {
      const mapping = mappings.get(path);
      const isFolder = path.endsWith('/') || !path.includes('.');

      if (mapping) {
        await fileMappingApi.update(space.slug, mapping.id, {
          file_path: path,
          is_folder: isFolder,
          is_visible: !currentValue,
          display_name_source: mapping.display_name_source,
        });
      } else {
        await fileMappingApi.create(space.slug, {
          file_path: path,
          is_folder: isFolder,
          is_visible: !currentValue,
          display_name_source: 'first_h1',
        });
      }

      onMappingChange();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  const handleChangeSource = async (path: string, source: string) => {
    try {
      const mapping = mappings.get(path);
      const isFolder = path.endsWith('/') || !path.includes('.');

      // If source is empty (Inherit), delete the mapping to use inheritance
      if (!source) {
        if (mapping) {
          await fileMappingApi.delete(space.slug, mapping.id);
        }
        onMappingChange();
        return;
      }

      if (mapping) {
        await fileMappingApi.update(space.slug, mapping.id, {
          file_path: path,
          is_folder: isFolder,
          is_visible: mapping.is_visible,
          display_name_source: source,
        } as any);

        // Name will be extracted by backend automatically
      } else {
        await fileMappingApi.create(space.slug, {
          file_path: path,
          is_folder: isFolder,
          is_visible: true,
          display_name_source: source,
        } as any);

        // Name will be extracted by backend automatically
      }

      onMappingChange();
    } catch (error) {
      console.error('Failed to change source:', error);
    }
  };

  // Memoize inheritance resolution for performance
  const inheritanceResolver = useMemo(() => {
    return (path: string) => {
      const isFolder = !path.includes('.') || path.endsWith('/');

      // 1. Check explicit mapping first (highest priority)
      const mapping = mappings.get(path);
      if (mapping) {
        return {
          isVisible: mapping.is_visible,
          displayName: mapping.effective_display_name,
          source: mapping.display_name_source,
          childrenSource: (mapping as any).children_display_name_source,
          isInherited: false, // Explicitly set
        };
      }

      // 2. Folders: Always default to filename (no inheritance)
      if (isFolder) {
        return {
          isVisible: true,
          displayName: undefined,
          source: 'filename',
          childrenSource: undefined,
          isInherited: false, // Folders don't inherit
        };
      }

      // 3. Files: Walk up parent folders for children_display_name_source
      const pathParts = path.split('/').filter(Boolean);
      for (let i = pathParts.length - 1; i >= 0; i--) {
        const parentPath = pathParts.slice(0, i).join('/');
        const parentMapping = mappings.get(parentPath);
        if (parentMapping && parentMapping.is_folder) {
          const childrenSource = (parentMapping as any).children_display_name_source;
          if (childrenSource) {
            return {
              isVisible: parentMapping.is_visible,
              displayName: undefined,
              source: childrenSource,
              isInherited: true,
              inheritedFrom: parentPath,
            };
          }
        }
      }

      // 4. Files: Fall back to space default
      return {
        isVisible: true,
        displayName: undefined,
        source: space.default_display_name_source || 'first_h1',
        isInherited: true,
        inheritedFrom: 'space',
      };
    };
  }, [mappings, space.default_display_name_source]);

  const getNodeConfig = (path: string) => {
    return inheritanceResolver(path);
  };

  const handleChangeChildrenSource = async (path: string, source: string) => {
    try {
      const mapping = mappings.get(path);
      const isFolder = true; // Only folders have children source

      if (mapping) {
        await fileMappingApi.update(space.slug, mapping.id, {
          file_path: path,
          is_folder: isFolder,
          is_visible: mapping.is_visible,
          display_name_source: mapping.display_name_source,
          children_display_name_source: source || null, // null means inherit
        } as any);
      } else {
        await fileMappingApi.create(space.slug, {
          file_path: path,
          is_folder: isFolder,
          is_visible: true,
          display_name_source: 'filename',
          children_display_name_source: source || null,
        } as any);
      }

      onMappingChange();
    } catch (error) {
      console.error('Failed to change children source:', error);
    }
  };

  const handleChangeDisplayName = async (path: string, displayName: string) => {
    try {
      const mapping = mappings.get(path);
      const isFolder = path.endsWith('/') || !path.includes('.');

      if (mapping) {
        await fileMappingApi.update(space.slug, mapping.id, {
          file_path: path,
          is_folder: isFolder,
          is_visible: mapping.is_visible,
          display_name_source: 'custom',
          display_name: displayName,
        } as any);
      } else {
        await fileMappingApi.create(space.slug, {
          file_path: path,
          is_folder: isFolder,
          is_visible: true,
          display_name_source: 'custom',
          display_name: displayName,
        } as any);
      }

      // Trigger refresh to update preview (config panel won't re-render due to no key)
      onMappingChange();
    } catch (error) {
      console.error('Failed to change display name:', error);
    }
  };

  return (
    <FileTree
      space={space}
      configMode={true}
      filters={filters}
      onToggleVisibility={handleToggleVisibility}
      onChangeSource={handleChangeSource}
      onChangeChildrenSource={handleChangeChildrenSource}
      _onChangeDisplayName={handleChangeDisplayName}
      getNodeConfig={getNodeConfig}
    />
  );
}
