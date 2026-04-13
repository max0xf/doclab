import React, { useState, useEffect } from 'react';
import { ArrowLeft, Folder, FileText, Loader2 } from 'lucide-react';
import type { Space } from '../types';
import { apiClient } from '../services/apiClient';

// Loading Spinner Component
function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
      <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </div>
    </div>
  );
}

interface MainViewProps {
  selectedSpace: Space | null;
  selectedPath: string | null;
  children: React.ReactNode;
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
}

/**
 * MainView component handles the main content area rendering.
 * It displays either:
 * - File browser (tree view) when a directory is selected
 * - File content viewer when a file is selected
 * - The default view (spaces list, repositories, etc.) when no space is selected
 */
export default function MainView({ selectedSpace, selectedPath, children }: MainViewProps) {
  // If a space is selected, render the space content view
  if (selectedSpace) {
    return <SpaceContentView space={selectedSpace} initialPath={selectedPath} />;
  }

  // Otherwise, render the default view (passed as children)
  return <>{children}</>;
}

interface SpaceContentViewProps {
  space: Space;
  initialPath: string | null;
}

function SpaceContentView({ space, initialPath }: SpaceContentViewProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  console.log('[MainView] SpaceContentView render:', {
    spaceName: space.name,
    initialPath,
    currentPath,
    selectedFile: selectedFile?.name,
    filesCount: files.length,
  });

  // Update currentPath when initialPath changes (from sidebar clicks)
  useEffect(() => {
    console.log('[MainView] initialPath changed:', { from: currentPath, to: initialPath });
    if (initialPath !== null && initialPath !== currentPath) {
      console.log('[MainView] Updating currentPath to:', initialPath);
      // Clear previous content immediately to show loading state
      setFiles([]);
      setSelectedFile(null);
      setFileContent('');
      setCurrentPath(initialPath);
    }
  }, [initialPath, currentPath]);

  // Determine if current path is a file or directory
  const isFilePath = (path: string) => {
    const fileExtensions =
      /\.(md|txt|json|yaml|yml|js|jsx|ts|tsx|py|java|go|rs|c|cpp|h|hpp|css|scss|html|xml|sql|sh|bash)$/i;
    return fileExtensions.test(path);
  };

  // Load directory contents or file content
  useEffect(() => {
    if (!space.git_repository_id) {
      return;
    }

    const loadContent = async () => {
      console.log('[MainView] loadContent called:', {
        currentPath,
        isFile: currentPath && isFilePath(currentPath),
        project_key: space.git_project_key,
        repo_slug: space.git_repository_id,
      });

      setIsLoading(true);
      try {
        if (!space.git_project_key || !space.git_repository_id) {
          console.error('[MainView] Missing git_project_key or git_repository_id');
          return;
        }

        // Check if this is a file path
        if (currentPath && isFilePath(currentPath)) {
          console.log('[MainView] Loading file content for:', currentPath);
          // Load file content
          const fileName = currentPath.split('/').pop() || '';
          setSelectedFile({
            name: fileName,
            type: 'file',
            path: currentPath,
          });

          // Fetch file content using space's Git provider info
          const params = new URLSearchParams({
            provider: space.git_provider || '',
            base_url: space.git_base_url || '',
            project_key: space.git_project_key,
            repo_slug: space.git_repository_id,
            file_path: currentPath,
            branch: space.git_default_branch || 'main',
          });

          const content = await apiClient.request<{ content: string }>(
            `/api/git-provider/v1/file?${params.toString()}`
          );
          setFileContent((content as any).content || '');
          setFiles([]);
        } else {
          console.log('[MainView] Loading directory contents for:', currentPath || '(root)');
          // Load directory contents using space's Git provider info
          setSelectedFile(null);
          const params = new URLSearchParams({
            provider: space.git_provider || '',
            base_url: space.git_base_url || '',
            project_key: space.git_project_key,
            repo_slug: space.git_repository_id,
            branch: space.git_default_branch || 'main',
            recursive: 'false',
          });

          if (currentPath) {
            params.append('path', currentPath);
          }

          const response = await apiClient.request<any>(
            `/api/git-provider/v1/tree?${params.toString()}`
          );

          console.log('Directory tree response:', response);

          // Extract items from response (API returns { items: [...] })
          const contents = (response as any)?.items || response || [];

          // Transform to FileItem format
          const items: FileItem[] = contents.map((item: any) => {
            // Extract name from path if name is not provided
            const name = item.name || item.path?.split('/').pop() || item.path || 'Unknown';
            return {
              name,
              type: item.type === 'dir' || item.type === 'directory' ? 'directory' : 'file',
              path: item.path,
              size: item.size,
            };
          });

          // Sort: directories first, then files
          items.sort((a, b) => {
            if (a.type === 'directory' && b.type === 'file') {
              return -1;
            }
            if (a.type === 'file' && b.type === 'directory') {
              return 1;
            }
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            return aName.localeCompare(bName);
          });

          console.log('Transformed items:', items);
          setFiles(items);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
        console.error('Error details:', {
          provider: space.git_provider,
          base_url: space.git_base_url,
          project_key: space.git_project_key,
          repo_slug: space.git_repository_id,
          currentPath,
          branch: space.git_default_branch,
        });
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [space, currentPath]);

  // Load file content when a file is selected
  useEffect(() => {
    const loadFileContent = async () => {
      if (!selectedFile || selectedFile.type === 'directory') {
        return;
      }

      console.log('[MainView] Loading file content for:', selectedFile.path);
      setIsLoading(true);
      setFileContent('');

      try {
        const params = new URLSearchParams({
          provider: space.git_provider || '',
          base_url: space.git_base_url || '',
          project_key: space.git_project_key || '',
          repo_slug: space.git_repository_id || '',
          file_path: selectedFile.path,
          branch: space.git_default_branch || 'main',
        });

        const response = await apiClient.request<any>(
          `/api/git-provider/v1/file?${params.toString()}`
        );

        console.log('File content response:', response);
        setFileContent(response.content || '');
      } catch (error) {
        console.error('Failed to load file content:', error);
        setFileContent('');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [space, selectedFile]);

  const handleFileClick = (file: FileItem) => {
    console.log('[MainView] File clicked:', file);
    if (file.type === 'directory') {
      console.log('[MainView] Navigating to directory:', file.path);
      setCurrentPath(file.path);
      setSelectedFile(null);
    } else {
      console.log('[MainView] Opening file:', file.path);
      setSelectedFile(file);
    }
  };

  const handleNavigateUp = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
    setSelectedFile(null);
  };

  // If a file is selected, show file viewer
  if (selectedFile) {
    return (
      <FileContentView
        space={space}
        file={selectedFile}
        fileContent={fileContent}
        isLoading={isLoading}
        onBack={() => {
          setSelectedFile(null);
          const pathParts = currentPath.split('/');
          pathParts.pop();
          setCurrentPath(pathParts.join('/'));
        }}
      />
    );
  }

  // Otherwise, show file browser (tree view)
  return (
    <FileBrowserView
      space={space}
      files={files}
      currentPath={currentPath}
      isLoading={isLoading}
      onFileClick={handleFileClick}
      onNavigateUp={handleNavigateUp}
    />
  );
}

interface FileBrowserViewProps {
  space: Space;
  files: FileItem[];
  currentPath: string;
  isLoading: boolean;
  onFileClick: (file: FileItem) => void;
  onNavigateUp: () => void;
}

function FileBrowserView({
  space,
  files,
  currentPath,
  isLoading,
  onFileClick,
  onNavigateUp,
}: FileBrowserViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        {currentPath && (
          <button
            onClick={onNavigateUp}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--primary)',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {space.name} {currentPath && `/ ${currentPath}`}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSpinner message="Loading directory contents..." />
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
              No files found
            </div>
          </div>
        ) : (
          <div>
            {files.map(file => (
              <button
                key={file.path}
                onClick={() => onFileClick(file)}
                className="w-full flex items-center gap-3 px-6 py-3 border-b hover:bg-opacity-50 transition-colors text-left"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'transparent',
                }}
              >
                {file.type === 'directory' ? (
                  <Folder size={18} style={{ color: 'var(--primary)' }} />
                ) : (
                  <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                )}
                <span
                  className={file.type === 'directory' ? 'font-medium' : ''}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {file.name}
                </span>
                {file.size !== undefined && file.type === 'file' && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {formatSize(file.size)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FileContentViewProps {
  space: Space;
  file: FileItem;
  fileContent: string;
  isLoading: boolean;
  onBack: () => void;
}

function FileContentView({ space, file, fileContent, isLoading, onBack }: FileContentViewProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* File Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--primary)',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {file.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {space.name} / {file.path}
          </div>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSpinner message="Loading file content..." />
        ) : (
          <div className="max-w-5xl mx-auto p-8">
            <pre
              className="p-6 rounded-lg font-mono text-sm whitespace-pre-wrap"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
              }}
            >
              {fileContent || 'No content available'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
