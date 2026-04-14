import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { Space } from '../types';

export interface TreeNode {
  name?: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: TreeNode[];
  title?: string;
  sha?: string;
}

interface FileTreeProps {
  space: Space;
  onSelectFile?: (path: string) => void;
  // Configuration mode props
  configMode?: boolean;
  filters?: string[];
  onToggleVisibility?: (path: string, currentValue: boolean) => void;
  onChangeSource?: (path: string, source: string) => void;
  onChangeChildrenSource?: (path: string, source: string) => void;
  _onChangeDisplayName?: (path: string, name: string) => void;
  getNodeConfig?: (
    path: string,
    isFolder: boolean
  ) => {
    isVisible: boolean;
    displayName?: string;
    source?: string;
    isInherited?: boolean;
    inheritedFrom?: string;
  };
}

const NAME_SOURCE_OPTIONS = [
  { value: 'first_h1', label: 'H1' },
  { value: 'first_h2', label: 'H2' },
  { value: 'title_frontmatter', label: 'Frontmatter' },
  { value: 'filename', label: 'Filename' },
  { value: 'custom', label: 'Custom' },
] as const;

export default function FileTree({
  space,
  onSelectFile: _onSelectFile,
  configMode = false,
  filters = [],
  onToggleVisibility,
  onChangeSource,
  onChangeChildrenSource,
  _onChangeDisplayName,
  getNodeConfig,
}: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const loadTree = useCallback(async () => {
    if (!space.git_repository_id || !space.git_provider || !space.git_base_url) {
      setError('Git repository not fully configured');
      setLoading(false);
      return;
    }

    if (!space.git_default_branch) {
      setError('Default branch not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        provider: space.git_provider || '',
        base_url: space.git_base_url || '',
        project_key: space.git_project_key || '',
        repo_slug: space.git_repository_id || '',
        branch: space.git_default_branch || 'main',
        recursive: 'false',
      });

      const result = await apiClient.request<TreeNode[]>(
        `/api/git-provider/v1/tree?${params.toString()}`
      );

      const sortedTree = (result || []).sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') {
          return -1;
        }
        if (a.type !== 'dir' && b.type === 'dir') {
          return 1;
        }
        const aName = a.name || a.path.split('/').pop() || '';
        const bName = b.name || b.path.split('/').pop() || '';
        return aName.localeCompare(bName);
      });

      setTree(sortedTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tree');
    } finally {
      setLoading(false);
    }
  }, [
    space.git_repository_id,
    space.git_provider,
    space.git_base_url,
    space.git_default_branch,
    space.git_project_key,
  ]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const toggleExpand = async (path: string, node: TreeNode) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(path);
      setExpandedPaths(newExpanded);

      if (!node.children || node.children.length === 0) {
        await loadSubdirectory(path);
      }
    }
  };

  const loadSubdirectory = async (path: string) => {
    try {
      const params = new URLSearchParams({
        provider: space.git_provider || '',
        base_url: space.git_base_url || '',
        project_key: space.git_project_key || '',
        repo_slug: space.git_repository_id || '',
        branch: space.git_default_branch || 'main',
        recursive: 'false',
        path: path,
      });

      const result = await apiClient.request<TreeNode[]>(
        `/api/git-provider/v1/tree?${params.toString()}`
      );

      const childrenWithFullPaths = (result || []).map(child => ({
        ...child,
        path: `${path}/${child.path}`,
      }));

      const sortedChildren = childrenWithFullPaths.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') {
          return -1;
        }
        if (a.type !== 'dir' && b.type === 'dir') {
          return 1;
        }
        const aName = a.name || a.path.split('/').pop() || '';
        const bName = b.name || b.path.split('/').pop() || '';
        return aName.localeCompare(bName);
      });

      const updateNodeChildren = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(n => {
          if (n.path === path) {
            return { ...n, children: sortedChildren };
          }
          if (n.children) {
            return { ...n, children: updateNodeChildren(n.children) };
          }
          return n;
        });
      };

      setTree(prevTree => updateNodeChildren(prevTree));
    } catch (err) {
      console.error('Failed to load subdirectory:', err);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isDirectory = node.type === 'dir';
    const config = getNodeConfig?.(node.path, isDirectory);

    // Check if file matches filters (folders always match)
    const matchesFilter =
      isDirectory || filters.length === 0 || filters.some(f => node.path.endsWith(f));
    const isGrayedOut = configMode && !matchesFilter;

    // In preview mode (non-config), hide non-visible nodes completely
    if (!configMode && config && !config.isVisible) {
      return null;
    }

    return (
      <div key={node.path}>
        <div
          className={`flex items-center px-2 py-1.5 text-sm transition-colors ${
            isGrayedOut ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {/* Expand/collapse button */}
          {isDirectory ? (
            <button onClick={() => toggleExpand(node.path, node)} className="flex-shrink-0 w-4">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}

          {/* Config mode: visibility checkbox */}
          {configMode && onToggleVisibility && (
            <input
              type="checkbox"
              checked={config?.isVisible ?? true}
              onChange={() => onToggleVisibility(node.path, config?.isVisible ?? true)}
              disabled={isGrayedOut}
              className="flex-shrink-0 mx-2"
            />
          )}

          {/* Icon */}
          {isDirectory ? (
            <Folder className="w-4 h-4 flex-shrink-0 text-blue-600 mr-2" />
          ) : (
            <File className="w-4 h-4 flex-shrink-0 text-gray-600 mr-2" />
          )}

          {/* File/folder name */}
          <span className="text-sm truncate" style={{ minWidth: '200px', maxWidth: '300px' }}>
            {config?.displayName || node.title || node.name || node.path.split('/').pop()}
          </span>

          {/* Config mode: Display As dropdown (for self) */}
          {configMode && onChangeSource && (
            <select
              value={config?.source || (isDirectory ? 'filename' : '')}
              onChange={e => onChangeSource(node.path, e.target.value)}
              disabled={isGrayedOut}
              className="ml-4 px-2 py-1 text-xs border rounded flex-shrink-0"
              style={{ width: '120px' }}
              onClick={e => e.stopPropagation()}
            >
              {isDirectory ? (
                <>
                  <option value="filename">Filename</option>
                  <option value="custom">Custom</option>
                </>
              ) : (
                <>
                  <option value="">Inherit</option>
                  {NAME_SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </select>
          )}

          {/* Config mode: Inheritance status */}
          {configMode && (
            <div className="ml-2 text-xs" style={{ width: '120px' }}>
              {config?.isInherited ? (
                <span
                  className="text-gray-500 italic"
                  title={`Inherited from ${config.inheritedFrom}`}
                >
                  ← {config.source?.toUpperCase() || 'H1'} (
                  {config.inheritedFrom === 'space' ? 'space' : 'parent'})
                </span>
              ) : (
                <span className="text-blue-600 font-medium">Override</span>
              )}
            </div>
          )}

          {/* Config mode: For Children dropdown (folders only) */}
          {configMode && isDirectory && onChangeChildrenSource && (
            <select
              value={(config as any)?.childrenSource || ''}
              onChange={e => onChangeChildrenSource(node.path, e.target.value)}
              className="ml-2 px-2 py-1 text-xs border rounded flex-1"
              style={{ maxWidth: '150px' }}
              onClick={e => e.stopPropagation()}
            >
              <option value="">Inherit from parent</option>
              <option value="first_h1">H1</option>
              <option value="first_h2">H2</option>
              <option value="title_frontmatter">Frontmatter</option>
              <option value="filename">Filename</option>
            </select>
          )}

          {/* Custom name input - shown when Custom is selected */}
          {configMode && config?.source === 'custom' && _onChangeDisplayName && (
            <div className="ml-2 flex items-center gap-1" style={{ maxWidth: '250px' }}>
              <input
                key={`${node.path}-${config?.displayName}`}
                type="text"
                defaultValue={config?.displayName || ''}
                placeholder="Enter custom name"
                className="px-2 py-1 text-xs border rounded flex-1"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const newName = e.currentTarget.value.trim();
                    if (newName && newName !== config?.displayName) {
                      _onChangeDisplayName(node.path, newName);
                    }
                  }
                }}
              />
              <button
                onClick={e => {
                  e.stopPropagation();
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  const newName = input?.value.trim();
                  if (newName && newName !== config?.displayName) {
                    _onChangeDisplayName(node.path, newName);
                  }
                }}
                className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex-shrink-0"
                title="Save custom name"
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {isDirectory && isExpanded && hasChildren && (
          <div>{node.children!.map(child => renderNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="px-4 py-2 text-sm text-gray-600">Loading tree...</div>;
  }

  if (error) {
    return (
      <div className="px-4 py-2">
        <div className="text-sm text-red-600">{error}</div>
        <button onClick={loadTree} className="text-xs mt-2 underline text-gray-600">
          Retry
        </button>
      </div>
    );
  }

  if (tree.length === 0) {
    return <div className="px-4 py-2 text-sm text-gray-600">No files found</div>;
  }

  return (
    <div className="overflow-y-auto">
      {/* Header row for config mode */}
      {configMode && (
        <div className="sticky top-0 bg-gray-100 border-b border-gray-300 px-2 py-2 text-xs font-semibold text-gray-600 flex items-center">
          <div className="w-4 flex-shrink-0" /> {/* Expand button space */}
          <div className="w-4 flex-shrink-0 mx-2" /> {/* Checkbox space */}
          <div className="w-4 flex-shrink-0 mr-2" /> {/* Icon space */}
          <div style={{ minWidth: '200px', maxWidth: '300px' }}>File/Folder</div>
          <div className="ml-4" style={{ width: '120px' }}>
            Display As
          </div>
          <div className="ml-2" style={{ width: '120px' }}>
            Status
          </div>
          <div className="ml-2 flex-1">For Children</div>
        </div>
      )}
      {tree.map(node => renderNode(node))}
    </div>
  );
}
