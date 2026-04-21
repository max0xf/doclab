import React, { useState } from 'react';
import { Code, BookOpen } from 'lucide-react';
import FileTree from '../../common/FileTree';
import type { FileMapping } from '../../../services/fileMappingApi';
import type { Space } from '../../../types';

interface FileMappingPreviewProps {
  space: Space;
  mappings: Map<string, FileMapping>;
  filters: string[];
}

export default function FileMappingPreview({ space, mappings, filters }: FileMappingPreviewProps) {
  const [viewMode, setViewMode] = useState<'developer' | 'document'>('document');

  const getNodeConfig = (path: string, isFolder: boolean) => {
    const mapping = mappings.get(path);

    // Determine visibility based on mode and configuration
    let isVisible = true;

    if (viewMode === 'document') {
      // Folders are always visible (filters don't apply to folders)
      if (isFolder) {
        // For folders, only respect explicit visibility settings
        isVisible = mapping?.is_visible ?? true;
      } else {
        // For files, check both visibility and filters
        isVisible = mapping?.is_visible ?? true;

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
      source: mapping?.display_name_source || 'first_h1',
    };
  };

  return (
    <div>
      {/* Header with mode toggle */}
      <div className="p-2 bg-gray-100 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Preview</h3>
          <div className="flex gap-0.5 p-0.5 rounded bg-white">
            <button
              onClick={() => setViewMode('document')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'document'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Documents"
            >
              <BookOpen className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('developer')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'developer'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Developer"
            >
              <Code className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree preview */}
      <FileTree space={space} filters={filters} getNodeConfig={getNodeConfig} />
    </div>
  );
}
