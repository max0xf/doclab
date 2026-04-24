import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Folder,
  FileText,
  MessageSquare,
  GitBranch,
  GitCommit,
  Pencil,
} from 'lucide-react';
import {
  enrichmentApi,
  streamEnrichments,
  type EnrichmentsResponse,
} from '../../services/enrichmentApi';
import type { Space } from '../../types';
import { apiClient } from '../../services/apiClient';
import { fileMappingApi, type FileMapping } from '../../services/fileMappingApi';
import SmartLoadingIndicator from '../common/SmartLoadingIndicator';
import { useDraftChanges } from '../../context/DraftChangeContext';
import { FileViewer } from './FileViewer';
import { SpaceWorkspaceBar, type SpaceWorkspaceBarHandle } from './SpaceWorkspaceBar';

interface MainViewProps {
  selectedSpace: Space | null;
  selectedPath: string | null;
  viewMode?: 'developer' | 'document';
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
export default function MainView({
  selectedSpace,
  selectedPath,
  viewMode = 'document',
  children,
}: MainViewProps) {
  // If a space is selected, render the space content view
  if (selectedSpace) {
    return (
      <SpaceContentView space={selectedSpace} initialPath={selectedPath} viewMode={viewMode} />
    );
  }

  // Otherwise, render the default view (passed as children)
  return <div className="flex-1 overflow-y-auto">{children}</div>;
}

interface SpaceContentViewProps {
  space: Space;
  initialPath: string | null;
  viewMode: 'developer' | 'document';
}

function SpaceContentView({ space, initialPath, viewMode }: SpaceContentViewProps) {
  // Read path from URL on mount (handle hash routing)
  const hash = window.location.hash;
  const hashParts = hash.split('?');
  const urlParams = new URLSearchParams(hashParts[1] || '');
  const urlPath = urlParams.get('path');
  const initialPathToUse = urlPath || initialPath || '';

  const workspaceBarRef = useRef<SpaceWorkspaceBarHandle>(null);
  const handleLog = useCallback((msg: string, level: 'info' | 'success' | 'error' = 'info') => {
    workspaceBarRef.current?.addLog(msg, level);
  }, []);

  const [currentPath, setCurrentPath] = useState<string>(initialPathToUse);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [enrichmentCounts, setEnrichmentCounts] = useState<
    Record<
      string,
      { comments: number; prNumbers: number[]; diffs: number; localChanges: number; edits: number }
    >
  >({});
  const [spaceEnrichments, setSpaceEnrichments] = useState<Record<string, EnrichmentsResponse>>({});
  const [enrichmentRefreshKey, setEnrichmentRefreshKey] = useState(0);

  // Update URL when path changes
  const updatePath = useCallback((newPath: string) => {
    setCurrentPath(newPath);

    // Parse current URL (handle hash routing)
    const hash = window.location.hash;
    const hashParts = hash.split('?');
    const hashPath = hashParts[0]; // e.g., "#spaces"
    const params = new URLSearchParams(hashParts[1] || '');

    // Update path parameter
    if (newPath) {
      params.set('path', newPath);
    } else {
      params.delete('path');
    }

    // Reconstruct URL with hash
    const newUrl = `${window.location.pathname}${hashPath}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, []);

  console.log('[MainView] SpaceContentView render:', {
    spaceName: space.name,
    initialPath,
    currentPath,
    selectedFile: selectedFile?.name,
    filesCount: files.length,
  });

  // Load space-level enrichments once when space is opened
  useEffect(() => {
    const loadSpaceEnrichments = async () => {
      try {
        console.log('[Enrichments] Loading space-level enrichments for:', space.slug);
        const response = await apiClient.request<Record<string, EnrichmentsResponse>>(
          `/api/enrichments/v1/enrichments/?space_slug=${space.slug}`
        );
        console.log(
          '[Enrichments] Space enrichments loaded:',
          Object.keys(response).length,
          'files'
        );
        setSpaceEnrichments(response);
      } catch (error) {
        console.error('[Enrichments] Failed to load space enrichments:', error);
        setSpaceEnrichments({});
      }
    };

    loadSpaceEnrichments();
  }, [space.slug]);

  // Update currentPath when initialPath changes (from sidebar clicks)
  useEffect(() => {
    console.log('[MainView] initialPath changed:', { from: currentPath, to: initialPath });
    if (initialPath !== null && initialPath !== currentPath) {
      console.log('[MainView] Updating currentPath to:', initialPath);
      // Clear previous content immediately to show loading state
      setFiles([]);
      setSelectedFile(null);
      setFileContent('');
      updatePath(initialPath);
    }
  }, [initialPath, currentPath, updatePath]);

  // Load directory contents or file content
  useEffect(() => {
    if (!space.git_repository_id) {
      return;
    }

    // Skip if a file is selected - loadFileContent useEffect handles it
    if (selectedFile) {
      return;
    }

    const loadContent = async () => {
      console.log('[MainView] loadContent called:', {
        currentPath,
        project_key: space.git_project_key,
        repo_slug: space.git_repository_id,
      });

      setIsLoadingDirectory(true);
      try {
        if (!space.git_project_key || !space.git_repository_id) {
          console.error('[MainView] Missing git_project_key or git_repository_id');
          return;
        }

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

        // If tree returns nothing for a non-root path the path is a file, not a directory.
        if (items.length === 0 && currentPath) {
          const name = currentPath.split('/').pop() || currentPath;
          setSelectedFile({ name, type: 'file', path: currentPath });
          return;
        }

        setFiles(items);

        // Calculate enrichment counts from space enrichments
        console.log('[Enrichments] Calculating counts for path:', currentPath || '(root)');
        console.log('[Enrichments] Total space enrichments:', Object.keys(spaceEnrichments).length);
        const counts: Record<
          string,
          {
            comments: number;
            prNumbers: number[];
            diffs: number;
            localChanges: number;
            edits: number;
          }
        > = {};

        items.forEach(item => {
          if (item.type === 'file') {
            const enrichment = spaceEnrichments[item.path];
            if (enrichment) {
              const prNumbers = Array.isArray(enrichment.pr_diff)
                ? enrichment.pr_diff.map((pr: any) => pr.pr_number)
                : [];
              counts[item.path] = {
                comments: Array.isArray(enrichment.comments) ? enrichment.comments.length : 0,
                prNumbers,
                diffs: Array.isArray(enrichment.diff) ? enrichment.diff.length : 0,
                localChanges: Array.isArray(enrichment.local_changes)
                  ? enrichment.local_changes.length
                  : 0,
                edits: Array.isArray(enrichment.edit) ? enrichment.edit.length : 0,
              };
            }
          } else {
            const folderPrefix = item.path + '/';
            let totalComments = 0;
            const uniquePrNumbers = new Set<number>();
            let totalDiffs = 0;
            let totalLocalChanges = 0;
            let totalEdits = 0;
            let matchedFiles = 0;

            Object.entries(spaceEnrichments).forEach(([filePath, enrichment]) => {
              if (filePath.startsWith(folderPrefix)) {
                matchedFiles++;
                totalComments += Array.isArray(enrichment.comments)
                  ? enrichment.comments.length
                  : 0;
                if (Array.isArray(enrichment.pr_diff)) {
                  enrichment.pr_diff.forEach((pr: any) => {
                    if (pr.pr_number) {
                      uniquePrNumbers.add(pr.pr_number);
                    }
                  });
                }
                totalDiffs += Array.isArray(enrichment.diff) ? enrichment.diff.length : 0;
                totalLocalChanges += Array.isArray(enrichment.local_changes)
                  ? enrichment.local_changes.length
                  : 0;
                totalEdits += Array.isArray(enrichment.edit) ? enrichment.edit.length : 0;
              }
            });

            if (
              totalComments > 0 ||
              uniquePrNumbers.size > 0 ||
              totalDiffs > 0 ||
              totalLocalChanges > 0 ||
              totalEdits > 0
            ) {
              const prNumbers = Array.from(uniquePrNumbers).sort((a, b) => b - a);
              console.log(
                `[Enrichments] Folder ${item.path}: ${matchedFiles} files, PRs: ${prNumbers.join(', ')}`
              );
              counts[item.path] = {
                comments: totalComments,
                prNumbers,
                diffs: totalDiffs,
                localChanges: totalLocalChanges,
                edits: totalEdits,
              };
            }
          }
        });

        console.log('[Enrichments] Calculated counts for directory:', counts);
        setEnrichmentCounts(counts);
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
        setIsLoadingDirectory(false);
      }
    };

    loadContent();
  }, [space, currentPath, spaceEnrichments, selectedFile]);

  // Load file content when a file is selected
  useEffect(() => {
    const loadFileContent = async () => {
      if (!selectedFile || selectedFile.type === 'directory') {
        return;
      }

      console.log('[MainView] Loading file content for:', selectedFile.path);
      setIsLoadingFileContent(true);
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
        setIsLoadingFileContent(false);
      }
    };

    loadFileContent();
  }, [space, selectedFile]);

  const handleFileClick = (file: FileItem) => {
    console.log('[MainView] File clicked:', file);
    if (file.type === 'directory') {
      console.log('[MainView] Navigating to directory:', file.path);
      updatePath(file.path);
      setSelectedFile(null);
    } else {
      console.log('[MainView] Opening file:', file.path);
      updatePath(file.path); // Update URL with file path
      setSelectedFile(file);
    }
  };

  const handleNavigateUp = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    updatePath(pathParts.join('/'));
    setSelectedFile(null);
  };

  const workspaceBar = (
    <SpaceWorkspaceBar
      ref={workspaceBarRef}
      space={space}
      onRefresh={() => {
        setSpaceEnrichments({});
        setEnrichmentRefreshKey(k => k + 1);
      }}
      onNavigateToFile={file =>
        handleFileClick({ name: file.split('/').pop() || file, type: 'file', path: file })
      }
    />
  );

  // If a file is selected, show file viewer
  if (selectedFile) {
    // Build source URI for enrichments and comments
    const sourceUri = enrichmentApi.buildSourceUri(
      space.git_provider || '',
      space.git_base_url || '',
      space.git_project_key || '',
      space.git_repository_id || '',
      space.git_default_branch || 'main',
      selectedFile.path
    );

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {workspaceBar}
        <FileContentView
          space={space}
          file={selectedFile}
          fileContent={fileContent}
          isLoading={isLoadingFileContent}
          sourceUri={sourceUri}
          enrichmentRefreshKey={enrichmentRefreshKey}
          onLog={handleLog}
          onBack={() => {
            setSelectedFile(null);
            const pathParts = currentPath.split('/');
            pathParts.pop();
            updatePath(pathParts.join('/'));
          }}
        />
      </div>
    );
  }

  // Otherwise, show file browser (tree view)
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {workspaceBar}
      <FileBrowserView
        space={space}
        files={files}
        currentPath={currentPath}
        isLoading={isLoadingDirectory}
        enrichmentCounts={enrichmentCounts}
        onFileClick={handleFileClick}
        onNavigateUp={handleNavigateUp}
        viewMode={viewMode}
      />
    </div>
  );
}

interface FileBrowserViewProps {
  space: Space;
  files: FileItem[];
  currentPath: string;
  isLoading: boolean;
  enrichmentCounts: Record<
    string,
    { comments: number; prNumbers: number[]; diffs: number; localChanges: number; edits: number }
  >;
  onFileClick: (file: FileItem) => void;
  onNavigateUp: () => void;
  viewMode: 'developer' | 'document';
}

function FileBrowserView({
  space,
  files,
  currentPath,
  isLoading,
  enrichmentCounts,
  onFileClick,
  onNavigateUp,
  viewMode,
}: FileBrowserViewProps) {
  const [mappings, setMappings] = useState<Map<string, FileMapping>>(new Map());

  // Load file mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappingsData = await fileMappingApi.list(space.slug);
        const mappingsMap = new Map<string, FileMapping>();
        mappingsData.forEach(m => {
          mappingsMap.set(m.file_path.replace(/\/$/, ''), m);
        });
        console.log('[Mappings] Loaded', mappingsData.length, 'mappings');
        console.log('[Mappings] All mapping paths:', Array.from(mappingsMap.keys()));
        setMappings(mappingsMap);
      } catch (error) {
        console.error('Failed to load mappings:', error);
      }
    };
    loadMappings();
  }, [space.slug]);

  // Apply display names and filters
  const getDisplayName = (file: FileItem): string => {
    // In developer mode, always show original filename
    if (viewMode === 'developer') {
      return file.name;
    }
    // In document mode, use custom display name if available
    const mapping = mappings.get(file.path);
    if (mapping && file.name === 'README.md') {
      console.log('[DisplayName] README.md mapping:', {
        filePath: file.path,
        mappingPath: mapping.file_path,
        displayName: mapping.effective_display_name,
      });
    }
    return mapping?.effective_display_name || file.name;
  };

  const isFileVisible = (file: FileItem): boolean => {
    // In developer mode, show everything
    if (viewMode === 'developer') {
      return true;
    }

    // In document mode, apply filters and visibility
    const mapping = mappings.get(file.path);
    const filters = space.filters || [];

    // Folders are always visible (unless explicitly hidden)
    if (file.type === 'directory') {
      return mapping?.effective_is_visible ?? true;
    }

    // Files: check visibility and filters
    const isVisible = mapping?.effective_is_visible ?? true;
    if (!isVisible) {
      return false;
    }

    // Apply filters only to files
    if (filters.length > 0) {
      return filters.some(filter => file.path.endsWith(filter));
    }

    return true;
  };

  // Filter files based on view mode
  const visibleFiles = files.filter(isFileVisible);

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
          <SmartLoadingIndicator message="Loading directory contents..." />
        ) : visibleFiles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
              {files.length === 0 ? 'No files found' : 'No files match the current filter'}
            </div>
          </div>
        ) : (
          <div>
            {visibleFiles.map(file => {
              const enrichments = enrichmentCounts[file.path] || {
                comments: 0,
                prNumbers: [],
                diffs: 0,
                localChanges: 0,
                edits: 0,
              };
              const hasEnrichments =
                enrichments.comments > 0 ||
                enrichments.prNumbers.length > 0 ||
                enrichments.diffs > 0 ||
                enrichments.localChanges > 0 ||
                enrichments.edits > 0;
              const displayName = getDisplayName(file);

              return (
                <button
                  key={file.path}
                  onClick={() => onFileClick(file)}
                  className="w-full grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-opacity-50 transition-colors text-left items-center"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: hasEnrichments ? 'rgba(227, 242, 253, 0.3)' : 'transparent',
                  }}
                >
                  {/* Name Column */}
                  <div className="col-span-7 flex items-center gap-3">
                    {file.type === 'directory' ? (
                      <Folder size={18} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                    )}
                    <span
                      className={file.type === 'directory' ? 'font-medium' : ''}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {displayName}
                    </span>
                  </div>

                  {/* Comments Column */}
                  <div className="col-span-2 flex items-center justify-center">
                    {enrichments.comments > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                        }}
                      >
                        <MessageSquare size={12} />
                        {enrichments.comments}
                      </span>
                    )}
                  </div>

                  {/* PRs / Diffs / Local Changes Column */}
                  <div className="col-span-2 flex items-center justify-center gap-1 flex-wrap">
                    {enrichments.prNumbers.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: '#6f42c1', color: 'white' }}
                        title={`PRs: ${enrichments.prNumbers.join(', ')}`}
                      >
                        <GitBranch size={12} />
                        {enrichments.prNumbers.slice(0, 3).join(', ')}
                        {enrichments.prNumbers.length > 3 &&
                          ` +${enrichments.prNumbers.length - 3}`}
                      </span>
                    )}
                    {enrichments.diffs > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: '#e65100', color: 'white' }}
                        title={`${enrichments.diffs} diff${enrichments.diffs !== 1 ? 's' : ''}`}
                      >
                        <GitCommit size={12} />
                        {enrichments.diffs}
                      </span>
                    )}
                    {enrichments.localChanges > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: '#2e7d32', color: 'white' }}
                        title={`${enrichments.localChanges} local change${enrichments.localChanges !== 1 ? 's' : ''}`}
                      >
                        <Pencil size={12} />
                        {enrichments.localChanges}
                      </span>
                    )}
                    {enrichments.edits > 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: '#0277bd', color: 'white' }}
                        title={`${enrichments.edits} draft edit${enrichments.edits !== 1 ? 's' : ''}`}
                      >
                        <Pencil size={12} />
                        {enrichments.edits}
                      </span>
                    )}
                  </div>

                  {/* Size Column */}
                  <div
                    className="col-span-1 text-right text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {file.type === 'file' && file.size !== undefined ? formatSize(file.size) : '-'}
                  </div>
                </button>
              );
            })}
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
  sourceUri: string;
  enrichmentRefreshKey?: number;
  onLog?: (msg: string, level?: 'info' | 'success' | 'error') => void;
}

function FileContentView({
  space,
  file,
  fileContent,
  isLoading,
  onBack,
  sourceUri,
  enrichmentRefreshKey,
  onLog,
}: FileContentViewProps) {
  const [enrichments, setEnrichments] = useState<EnrichmentsResponse>({});
  const [mappings, setMappings] = useState<Map<string, FileMapping>>(new Map());
  const [breadcrumbPath, setBreadcrumbPath] = useState<string>('');
  const { saveChange } = useDraftChanges();
  // Stable ref so loadEnrichments can call onLog without adding it to deps
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  // Load file mappings
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const mappingsData = await fileMappingApi.list(space.slug);
        const mappingsMap = new Map<string, FileMapping>();
        mappingsData.forEach(m => {
          mappingsMap.set(m.file_path.replace(/\/$/, ''), m);
        });
        setMappings(mappingsMap);
      } catch (error) {
        console.error('[FileContentView] Failed to load mappings:', error);
      }
    };
    loadMappings();
  }, [space.slug]);

  // Build breadcrumb path with mapped names
  useEffect(() => {
    if (!file || mappings.size === 0) {
      setBreadcrumbPath(file?.path || '');
      return;
    }

    const pathParts = file.path.split('/');
    const mappedParts: string[] = [];
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      currentPath = i === 0 ? pathParts[i] : `${currentPath}/${pathParts[i]}`;
      const mapping = mappings.get(currentPath);
      const displayName = mapping?.effective_display_name || pathParts[i];
      mappedParts.push(displayName);
    }

    setBreadcrumbPath(mappedParts.join(' / '));
  }, [file, mappings]);

  // Load enrichments function — uses streaming endpoint so PR-check progress
  // appears as live messages in SpaceWorkspaceBar.
  const loadEnrichments = useCallback(async () => {
    if (!file) {
      return;
    }

    try {
      const response = await streamEnrichments(sourceUri, msg => {
        onLogRef.current?.(msg);
      });
      setEnrichments(response || {});
      // Replace the last lingering progress message with a brief success note
      // (success level clears in 5s vs 30s for info).
      const prCount = (response?.pr_diff ?? []).length;
      onLogRef.current?.(
        prCount > 0
          ? `Enrichments loaded — ${prCount} matching PR${prCount !== 1 ? 's' : ''}`
          : 'Enrichments loaded',
        'success'
      );
    } catch (error) {
      console.error('[FileContentView] Failed to load enrichments:', error);
      onLogRef.current?.('Failed to load enrichments', 'error');
      setEnrichments({});
    }
  }, [file, sourceUri]);

  // Load enrichments when file changes or workspace state resets
  useEffect(() => {
    loadEnrichments();
  }, [sourceUri, loadEnrichments, enrichmentRefreshKey]);

  const handleSave = async (newContent: string, description: string) => {
    console.log('[FileContentView] Saving changes:', { file: file.path, description });

    try {
      // Save as draft change
      await saveChange(space.id, file.path, fileContent, newContent, 'modify', description);
      console.log('[FileContentView] Change saved as draft');

      // Reload enrichments to show the new draft
      await loadEnrichments();
    } catch (error) {
      console.error('[FileContentView] Save failed:', error);
      throw error;
    }
  };

  if (isLoading) {
    return <SmartLoadingIndicator message="Loading file content..." />;
  }

  // Get display name for the file
  const fileMapping = mappings.get(file.path);
  const displayFileName = fileMapping?.effective_display_name || file.name;

  return (
    <FileViewer
      fileName={displayFileName}
      filePath={file.path}
      breadcrumbPath={breadcrumbPath}
      spaceName={space.name}
      spaceId={space.id}
      content={fileContent}
      enrichments={enrichments}
      onBack={onBack}
      onSave={handleSave}
      onEnrichmentsReload={loadEnrichments}
      sourceUri={sourceUri}
      onLog={onLog}
    />
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
