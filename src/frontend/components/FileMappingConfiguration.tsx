import React, { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { fileMappingApi } from '../services/fileMappingApi';
import FileMappingConfigPanel from './FileMappingConfigPanel';
import FileMappingPreview from './FileMappingPreview';
import type { FileMapping } from '../services/fileMappingApi';
import type { Space } from '../types';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

interface FileMappingConfigurationProps {
  space: Space;
  onClose: () => void;
}

export default function FileMappingConfiguration({
  space,
  onClose,
}: FileMappingConfigurationProps) {
  const [mappings, setMappings] = useState<Map<string, FileMapping>>(new Map());
  const [filters, setFilters] = useState<string[]>([]);
  const [newFilter, setNewFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [spaceDefault, setSpaceDefault] = useState('');
  const configPanelRef = useRef<HTMLDivElement>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);

  // Load space data and mappings
  useEffect(() => {
    const loadData = async () => {
      try {
        // Reload space to get latest filters and settings
        const response = await fetch(`/api/wiki/v1/spaces/${space.slug}/`);
        const spaceData = await response.json();

        setFilters(spaceData.filters || []);
        setSpaceDefault(spaceData.default_display_name_source || 'first_h1');

        // Load mappings
        const mappingsData = await fileMappingApi.list(space.slug);
        const mappingsMap = new Map<string, FileMapping>();
        mappingsData.forEach(m => mappingsMap.set(m.file_path, m));
        setMappings(mappingsMap);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, [space.slug]);

  const handleAddFilter = async () => {
    if (newFilter && !filters.includes(newFilter)) {
      const newFilters = [...filters, newFilter];
      setFilters(newFilters);
      setNewFilter('');
      await saveFilters(newFilters);
    }
  };

  const handleRemoveFilter = async (filter: string) => {
    const newFilters = filters.filter(f => f !== filter);
    setFilters(newFilters);
    await saveFilters(newFilters);
  };

  const saveFilters = async (newFilters: string[]) => {
    try {
      await fetch(`/api/wiki/v1/spaces/${space.slug}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ filters: newFilters }),
      });
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  };

  const handleMappingChange = async () => {
    // Save scroll positions before refresh
    const configScroll = configPanelRef.current?.scrollTop || 0;
    const previewScroll = previewPanelRef.current?.scrollTop || 0;

    // Reload mappings data first
    try {
      const mappingsData = await fileMappingApi.list(space.slug);
      const mappingsMap = new Map<string, FileMapping>();
      mappingsData.forEach(m => mappingsMap.set(m.file_path, m));
      setMappings(mappingsMap);
    } catch (error) {
      console.error('Failed to reload mappings:', error);
    }

    // Then trigger preview refresh
    setRefreshKey(prev => prev + 1);

    // Restore scroll positions after render
    requestAnimationFrame(() => {
      if (configPanelRef.current) {
        configPanelRef.current.scrollTop = configScroll;
      }
      if (previewPanelRef.current) {
        previewPanelRef.current.scrollTop = previewScroll;
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-7xl mx-auto" style={{ height: '90vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">File Mapping Configuration</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const response = await fetch(
                  `/api/wiki/v1/spaces/${space.slug}/file-mappings/refresh/`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  }
                );
                const data = await response.json();
                alert(data.message || 'Refresh complete');
                handleMappingChange(); // Refresh UI
              } catch (error) {
                console.error('Refresh failed:', error);
                alert('Refresh failed. See console for details.');
              }
            }}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            title="Extract fresh content from files and update display names"
          >
            Refresh
          </button>
          <button
            onClick={async () => {
              if (
                window.confirm(
                  'Sync will remove mappings for deleted files and recompute effective values. Continue?'
                )
              ) {
                try {
                  const response = await fetch(
                    `/api/wiki/v1/spaces/${space.slug}/file-mappings/sync/`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                    }
                  );
                  const data = await response.json();
                  alert(data.message || 'Sync complete');
                  handleMappingChange(); // Refresh
                } catch (error) {
                  console.error('Sync failed:', error);
                  alert('Sync failed. See console for details.');
                }
              }
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Remove mappings for deleted files and recompute effective values"
          >
            Sync
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Space-wide defaults and filters */}
      <div className="p-4 border-b bg-gray-50 space-y-3">
        {/* Default display name source */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Space default:</span>
          <select
            value={spaceDefault}
            onChange={async e => {
              const newDefault = e.target.value;
              setSpaceDefault(newDefault);
              try {
                await fetch(`/api/wiki/v1/spaces/${space.slug}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ default_display_name_source: newDefault }),
                });
                // Trigger preview refresh
                setRefreshKey(prev => prev + 1);
              } catch (error) {
                console.error('Failed to save default:', error);
              }
            }}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value="first_h1">H1</option>
            <option value="first_h2">H2</option>
            <option value="title_frontmatter">Frontmatter</option>
            <option value="filename">Filename</option>
          </select>
          <span className="text-xs text-gray-500">(applies to all files unless overridden)</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Filters:</span>
          {filters.map(filter => (
            <span
              key={filter}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm flex items-center gap-1"
            >
              {filter}
              <button onClick={() => handleRemoveFilter(filter)} className="hover:text-blue-900">
                <X size={14} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newFilter}
            onChange={e => setNewFilter(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddFilter()}
            placeholder=".xml"
            className="px-2 py-1 border rounded text-sm w-20"
          />
          <button
            onClick={handleAddFilter}
            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Main content - two panels */}
      <div className="flex" style={{ height: 'calc(90vh - 180px)' }}>
        {/* Left: Configuration Panel */}
        <div ref={configPanelRef} className="flex-1 border-r overflow-auto">
          <FileMappingConfigPanel
            space={{ ...space, default_display_name_source: spaceDefault }}
            mappings={mappings}
            filters={filters}
            onMappingChange={handleMappingChange}
          />
        </div>

        {/* Right: Preview Panel */}
        <div ref={previewPanelRef} className="w-96 overflow-auto">
          <FileMappingPreview
            key={`preview-${refreshKey}`}
            space={{ ...space, default_display_name_source: spaceDefault }}
            mappings={mappings}
            filters={filters}
          />
        </div>
      </div>
    </div>
  );
}
