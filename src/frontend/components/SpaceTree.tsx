import React, { useState, useEffect } from 'react';
import { Code, BookOpen } from 'lucide-react';
import FileTree from './FileTree';
import { fileMappingApi } from '../services/fileMappingApi';
import type { Space } from '../types';
import type { FileMapping } from '../services/fileMappingApi';

type ViewMode = 'developer' | 'document';

interface SpaceTreeProps {
  space: Space;
  spaceName: string;
  onSelectFile?: (path: string) => void;
}

export default function SpaceTree({ space, spaceName, onSelectFile }: SpaceTreeProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [mappings, setMappings] = useState<Map<string, FileMapping>>(new Map());

  // Load file mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappingsData = await fileMappingApi.list(space.slug);
        const mappingsMap = new Map<string, FileMapping>();
        mappingsData.forEach(m => mappingsMap.set(m.file_path, m));
        setMappings(mappingsMap);
      } catch (error) {
        console.error('Failed to load mappings:', error);
      }
    };
    loadMappings();
  }, [space.slug]);

  const getNodeConfig = (path: string, isFolder: boolean) => {
    const mapping = mappings.get(path);
    const filters = space.filters || [];

    // Determine visibility based on mode and configuration
    let isVisible = true;

    if (viewMode === 'document') {
      // Folders are always visible (filters don't apply to folders)
      if (isFolder) {
        // For folders, only respect explicit visibility settings
        isVisible = mapping?.effective_is_visible ?? true;
      } else {
        // For files, check both visibility and filters
        isVisible = mapping?.effective_is_visible ?? true;

        // Apply filters only to files
        if (filters.length > 0) {
          const matchesFilter = filters.some(filter => path.endsWith(filter));
          isVisible = isVisible && matchesFilter;
        }
      }
    }
    // In developer mode, show everything

    return {
      isVisible,
      displayName: mapping?.effective_display_name,
      source: mapping?.display_name_source || space.default_display_name_source || 'first_h1',
    };
  };

  return (
    <div>
      <div className="px-4 py-1.5 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
          {spaceName}
        </div>
        <div
          className="flex gap-0.5 p-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <button
            onClick={() => setViewMode('document')}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: viewMode === 'document' ? 'var(--sidebar-active)' : 'transparent',
              color: viewMode === 'document' ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
            }}
            title="Documents"
          >
            <BookOpen className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('developer')}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: viewMode === 'developer' ? 'var(--sidebar-active)' : 'transparent',
              color:
                viewMode === 'developer' ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
            }}
            title="Developer"
          >
            <Code className="w-3 h-3" />
          </button>
        </div>
      </div>
      <FileTree
        space={space}
        filters={space.filters || []}
        getNodeConfig={getNodeConfig}
        onSelectFile={onSelectFile}
      />
    </div>
  );
}
