import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Code, BookOpen } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { Space } from '../types';

interface TreeNode {
  name?: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: TreeNode[];
  title?: string;
  sha?: string;
}

type ViewMode = 'developer' | 'document';

interface SpaceTreeProps {
  space: Space;
  spaceName: string;
  onSelectFile?: (path: string) => void;
}

export default function SpaceTree({ space, spaceName, onSelectFile }: SpaceTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('document');

  const loadTree = useCallback(async () => {
    // Check if space has Git configuration
    if (!space.git_repository_id || !space.git_provider || !space.git_base_url) {
      setError('Git repository not fully configured');
      setLoading(false);
      return;
    }

    if (!space.git_default_branch) {
      setError('Default branch not configured. Please update the space configuration.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Construct repository ID based on provider
      const params = new URLSearchParams({
        provider: space.git_provider || '',
        base_url: space.git_base_url || '',
        project_key: space.git_project_key || '',
        repo_slug: space.git_repository_id || '',
        branch: space.git_default_branch || 'main',
        recursive: 'false', // Don't fetch recursively - load on demand
      });

      const result = await apiClient.request<TreeNode[]>(
        `/api/git-provider/v1/tree?${params.toString()}`
      );

      // Sort: directories first, then files, both alphabetically
      const sortedTree = (result || []).sort((a, b) => {
        // Directories come before files
        if (a.type === 'dir' && b.type !== 'dir') {
          return -1;
        }
        if (a.type !== 'dir' && b.type === 'dir') {
          return 1;
        }
        // Within same type, sort alphabetically
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
  }, [loadTree, viewMode]);

  const toggleExpand = async (path: string, node: TreeNode) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(path);
      setExpandedPaths(newExpanded);

      // Lazy load children if not already loaded
      if (!node.children || node.children.length === 0) {
        await loadSubdirectory(path, node);
      }
    }
  };

  const loadSubdirectory = async (path: string, _node: TreeNode) => {
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

      // Fix paths - API returns relative paths, we need full paths
      const childrenWithFullPaths = (result || []).map(child => ({
        ...child,
        path: `${path}/${child.path}`,
      }));

      // Sort: directories first, then files, both alphabetically
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

      // Update the tree with loaded children
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

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            console.log('[SpaceTree] Item clicked:', {
              path: node.path,
              type: node.type,
              isDirectory,
              hasOnSelectFile: !!onSelectFile,
            });

            if (isDirectory) {
              console.log('[SpaceTree] Expanding directory:', node.path);
              toggleExpand(node.path, node);
              // Also notify parent to update main view
              console.log('[SpaceTree] Calling onSelectFile for directory:', node.path);
              onSelectFile?.(node.path);
            } else {
              console.log('[SpaceTree] Calling onSelectFile for file:', node.path);
              onSelectFile?.(node.path);
            }
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-opacity-10 hover:bg-white transition-colors text-left"
          style={{
            paddingLeft: `${level * 12 + 8}px`,
            color: 'var(--sidebar-text)',
          }}
        >
          {isDirectory ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              <Folder className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </>
          ) : (
            <>
              <div className="w-4 h-4 flex-shrink-0" />
              <File className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </>
          )}
          <span className="truncate">{node.title || node.name || node.path.split('/').pop()}</span>
        </button>

        {isDirectory && isExpanded && hasChildren && (
          <div>{node.children!.map(child => renderNode(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        Loading tree...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2">
        <div className="text-sm" style={{ color: 'var(--text-danger)' }}>
          {error}
        </div>
        <button
          onClick={loadTree}
          className="text-xs mt-2 underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        No pages found
      </div>
    );
  }

  return (
    <div>
      {/* Space Name with Mode Switcher */}
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

      {/* Tree */}
      <div className="overflow-y-auto">{tree.map(node => renderNode(node))}</div>
    </div>
  );
}
