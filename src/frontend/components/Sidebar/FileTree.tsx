import React, { useState, useEffect } from 'react';
import { FileCode, Folder, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { wikiApi, TreeNode } from '../../services/wikiApi';
import { repositoryApi } from '../../services/repositoryApi';
import { Urls } from '../../types';

interface FileTreeProps {
  repositoryId: string;
  currentPath: string;
}

interface TreeNodeItemProps {
  node: TreeNode;
  repositoryId: string;
  navigate: (view: string) => void;
  level: number;
}

interface TreeNodeItemPropsExtended extends TreeNodeItemProps {
  branch: string;
  currentPath: string;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string, expanded: boolean) => void;
}

function TreeNodeItem({
  node,
  repositoryId,
  navigate,
  level,
  branch,
  currentPath,
  expandedPaths,
  onToggleExpand,
}: TreeNodeItemPropsExtended) {
  const isExpanded = expandedPaths.has(node.path);
  const isActive = currentPath === node.path;
  // Initialize children - backend may return undefined for directories
  const [children, setChildren] = useState<TreeNode[]>(
    node.type === 'dir' ? node.children || [] : []
  );
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (node.type === 'dir') {
      // Navigate to folder in content view
      navigate(`${Urls.Repositories}?repo=${repositoryId}&path=${encodeURIComponent(node.path)}`);

      // Also expand/collapse the folder in the tree
      if (!isExpanded && children.length === 0) {
        // Lazy load children when expanding for the first time
        setLoading(true);
        try {
          const response = await wikiApi.getRepositoryTree(
            repositoryId,
            'developer',
            branch,
            node.path
          );
          setChildren(response.tree);
        } catch (err: any) {
          console.error('Failed to load folder contents:', err);

          // Check if it's a 401 error (authentication/token issue)
          if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
            alert(
              '⚠️ Authentication Error\n\n' +
                'Your access token has expired or is invalid.\n\n' +
                'Please refresh your Git provider token in your profile settings:\n' +
                '1. Click on your profile icon\n' +
                '2. Go to Settings\n' +
                '3. Update your Git Provider Token\n\n' +
                'Then refresh this page.'
            );
          } else {
            alert(
              '❌ Failed to Load Folder\n\n' +
                `Could not load contents of "${node.name}".\n\n` +
                'Error: ' +
                (err.message || 'Unknown error')
            );
          }
        } finally {
          setLoading(false);
        }
      }
      onToggleExpand(node.path, !isExpanded);
    } else {
      navigate(`${Urls.Repositories}?repo=${repositoryId}&path=${encodeURIComponent(node.path)}`);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1.5 py-1 px-2 text-xs hover:bg-opacity-10 hover:bg-gray-500 rounded transition-all"
        style={{
          paddingLeft: `${level * 12 + 8}px`,
          color: 'var(--sidebar-text)',
          backgroundColor: isActive ? 'var(--sidebar-active)' : undefined,
          fontWeight: isActive ? '600' : 'normal',
        }}
      >
        {node.type === 'dir' && (
          <>
            {loading ? (
              <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 flex-shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 flex-shrink-0" />
          </>
        )}
        {node.type === 'file' && <FileCode className="w-3.5 h-3.5 flex-shrink-0 ml-3" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <TreeNodeItem
              key={child.path}
              node={child}
              repositoryId={repositoryId}
              navigate={navigate}
              level={level + 1}
              branch={branch}
              currentPath={currentPath}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ repositoryId, currentPath }: FileTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<string>('master');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const navigate = (view: string) => {
    window.location.hash = view;
  };

  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, get repository info to get the correct default branch
        const repo = await repositoryApi.getById(repositoryId);
        const defaultBranch = repo.defaultBranch || 'master';
        setBranch(defaultBranch);

        // Then fetch the root tree with the correct branch
        const response = await wikiApi.getRepositoryTree(repositoryId, 'developer', defaultBranch);
        setTree(response.tree);
      } catch (err) {
        console.error('Failed to fetch file tree:', err);
        setError('Failed to load file structure');
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [repositoryId]);

  // Auto-expand folders to show current file
  useEffect(() => {
    if (currentPath && tree.length > 0) {
      const pathParts = currentPath.split('/');
      const newExpanded = new Set<string>();

      // Expand all parent folders
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderPath = pathParts.slice(0, i + 1).join('/');
        newExpanded.add(folderPath);
      }

      setExpandedPaths(newExpanded);
    }
  }, [currentPath, tree]);

  const handleToggleExpand = (path: string, expanded: boolean) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (expanded) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div
        className="mt-2 px-4 py-2 flex items-center gap-2 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading file structure...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 px-4 py-2 text-xs" style={{ color: 'var(--text-danger)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {tree.length === 0 && !loading && !error && (
        <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          No files found
        </div>
      )}
      {tree.map(node => (
        <TreeNodeItem
          key={node.path}
          node={node}
          repositoryId={repositoryId}
          navigate={navigate}
          level={0}
          branch={branch}
          currentPath={currentPath}
          expandedPaths={expandedPaths}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
}
