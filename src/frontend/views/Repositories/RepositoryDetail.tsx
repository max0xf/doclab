import React, { useState, useEffect, useCallback } from 'react';
import { Repository } from '../../types';
import {
  Star,
  GitBranch,
  ChevronDown,
  Folder,
  FileText,
  MessageSquare,
  Loader,
  AlertTriangle,
} from 'lucide-react';
import CommentsPanel from '../../components/CommentsPanel';
import { commentsApi } from '../../services/commentsApi';
import PullRequestsTab from './PullRequestsTab';
import { FileContentWithModes } from './components/FileViewer/FileContentWithModes';
import { gitProviderApi } from '../../services/gitProviderApi';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: string;
  lastAuthor?: string;
  isPhantom?: boolean; // True if this file/folder doesn't exist yet (added in PR)
}

interface RepositoryDetailProps {
  repository: Repository;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: (repoId: string) => void;
}

export default function RepositoryDetail({
  repository,
  isFavorite,
  onBack: _onBack,
  onToggleFavorite,
}: RepositoryDetailProps) {
  const [activeTab, setActiveTab] = useState<'source' | 'pull-requests'>('source');
  const [_selectedPR, setSelectedPR] = useState<any | null>(null);
  const [prDiffData, setPRDiffData] = useState<any>(null);
  const [allPRDiffs, setAllPRDiffs] = useState<any[]>([]);
  const [currentPRIndex, setCurrentPRIndex] = useState(0);
  const [prFileMap, setPRFileMap] = useState<Map<string, any[]>>(new Map());
  const [isPRMapLoading, setIsPRMapLoading] = useState(true);
  const [_branches, setBranches] = useState<any[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);

  console.log('RepositoryDetail mounted:', {
    repositoryId: repository.id,
    defaultBranch: repository.defaultBranch,
    currentBranch,
    currentPath,
  });

  // Listen to URL hash changes to sync with tree navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('Full hash:', hash);
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const pathFromUrl = params.get('path') || '';
      console.log('Hash changed, updating path:', pathFromUrl);
      console.log('All URL params:', Array.from(params.entries()));
      setCurrentPath(pathFromUrl);
    };

    // Set initial path from URL
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load branches on mount and reset state when repository changes
  useEffect(() => {
    // Reset state when repository changes
    setSelectedFile(null);
    setFileContent('');
    setShowComments(false);
    setSelectedLines(null);

    const loadBranches = async () => {
      try {
        const branchNames = await gitProviderApi.listBranches(repository.id);
        console.log('Loaded branches:', branchNames);
        const branchObjects = branchNames.map(name => ({
          name,
          isDefault: name === 'main' || name === 'master',
        }));
        setBranches(branchObjects);

        // Set current branch to main/master if available, otherwise use first branch
        const defaultBranch =
          branchNames.find(b => b === 'main' || b === 'master') || branchNames[0];
        setCurrentBranch(defaultBranch || 'main');
      } catch (error) {
        console.error('Failed to load branches:', error);
        setCurrentBranch('main');
      }
    };
    loadBranches();
  }, [repository.id]);

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [selectedLines, setSelectedLines] = useState<{ start: number; end: number } | null>(null);
  const [fileCommentCounts, setFileCommentCounts] = useState<Record<string, number>>({});
  const [fileComments, setFileComments] = useState<any[]>([]);

  useEffect(() => {
    console.log('showComments changed:', showComments);
    console.log('selectedLines:', selectedLines);
    console.log('selectedFile:', selectedFile?.name);
    if (showComments) {
      console.log('Comments panel SHOULD be visible now');
    }
  }, [showComments, selectedLines, selectedFile]);

  const loadFiles = useCallback(async () => {
    console.log('loadFiles called:', { repository: repository.id, currentPath, currentBranch });
    setIsLoading(true);
    try {
      // Check if currentPath looks like a file (has a common file extension)
      // Common file extensions - this avoids treating dot-folders like .claude, .github as files
      const fileExtensions =
        /\.(md|txt|json|yaml|yml|js|jsx|ts|tsx|py|java|go|rs|c|cpp|h|hpp|css|scss|html|xml|sql|sh|bash|zsh|fish|rb|php|swift|kt|cs|r|m|mm|pl|lua|vim|el|clj|scala|groovy|gradle|properties|conf|cfg|ini|toml|lock|log|csv|tsv|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|tar|gz|bz2|xz|7z|rar|png|jpg|jpeg|gif|svg|ico|webp|mp3|mp4|avi|mov|mkv|flv|wmv|woff|woff2|ttf|otf|eot)$/i;
      const isFile = currentPath && fileExtensions.test(currentPath);

      if (isFile) {
        // Load file content instead of directory listing
        console.log('Loading file content for:', currentPath);
        const fileName = currentPath.split('/').pop() || '';
        setSelectedFile({
          name: fileName,
          type: 'file',
          path: currentPath,
          size: 0,
        });
        setFiles([]);
        setIsLoading(false);
        return;
      }

      // Loading a directory - clear selectedFile to show directory listing
      setSelectedFile(null);

      // Call the git provider API to get directory contents
      console.log('Fetching directory tree:', {
        repository: repository.id,
        currentPath,
        currentBranch,
      });
      const data = await gitProviderApi.getDirectoryTree(
        repository.id,
        currentPath,
        currentBranch!,
        false
      );
      console.log('Loaded directory data:', data);

      // Transform API response to FileItem format
      const items: FileItem[] = (data.items || []).map((item: any) => ({
        name: item.name,
        type: item.type === 'dir' ? 'directory' : 'file',
        path: item.path,
        size: item.size,
        lastModified: item.last_modified,
        lastAuthor: item.last_author,
      }));

      // Add phantom files/folders from PRs that don't exist in current branch
      const existingPaths = new Set(items.map(item => item.path));
      const phantomItems: FileItem[] = [];

      // Get current directory path for filtering
      const currentDir = currentPath ? currentPath + '/' : '';

      // Find all PR files that should appear in this directory
      for (const [filePath, prsForFile] of prFileMap.entries()) {
        // Check if this file is in the current directory
        if (filePath.startsWith(currentDir)) {
          const relativePath = filePath.substring(currentDir.length);
          const firstSlash = relativePath.indexOf('/');

          // Determine if this is a direct child or in a subdirectory
          const childPath =
            firstSlash === -1 ? filePath : currentDir + relativePath.substring(0, firstSlash);
          const childName =
            firstSlash === -1 ? relativePath : relativePath.substring(0, firstSlash);
          const isDirectory = firstSlash !== -1;

          // Only add if it doesn't already exist and is added in a PR
          if (!existingPaths.has(childPath)) {
            const changeTypes = prsForFile.map(p => p.file.change_type);
            if (changeTypes.includes('added')) {
              // Avoid duplicates in phantom items
              if (!phantomItems.some(item => item.path === childPath)) {
                phantomItems.push({
                  name: childName,
                  type: isDirectory ? 'directory' : 'file',
                  path: childPath,
                  size: undefined,
                  lastModified: undefined,
                  lastAuthor: undefined,
                  isPhantom: true,
                });
              }
            }
          }
        }
      }

      // Merge actual and phantom items
      const allItems = [...items, ...phantomItems];

      // Sort: directories first (alphabetically), then files (alphabetically)
      allItems.sort((a, b) => {
        if (a.type === 'directory' && b.type === 'file') {
          return -1;
        }
        if (a.type === 'file' && b.type === 'directory') {
          return 1;
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      setFiles(allItems);
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, repository.id, currentBranch, prFileMap]);

  useEffect(() => {
    console.log('useEffect triggered for loadFiles:', {
      currentBranch,
      currentPath,
      repositoryId: repository.id,
      loadFiles: !!loadFiles,
    });
    // Only load files once we have a branch set
    if (currentBranch) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFiles, currentBranch, currentPath]);

  // Load all open PRs when repository is opened
  useEffect(() => {
    if (!currentBranch) {
      return;
    }

    const loadOpenPRs = async () => {
      console.log('Loading open PRs for repository:', repository.fullName);
      setIsPRMapLoading(true);
      try {
        const response = await fetch(`/api/git/v1/repos/${repository.fullName}/pulls/`, {
          credentials: 'include',
        });

        console.log('PR list response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          const allPRs = data.items || [];

          // Filter PRs to only show those targeting the current branch
          const openPRs = allPRs.filter((pr: any) => pr.target_branch === currentBranch);
          console.log(
            `Found ${allPRs.length} open PRs, ${openPRs.length} target branch '${currentBranch}':`,
            openPRs.map((pr: any) => `#${pr.number}`)
          );

          // Load file changes for each PR to build the file map
          const fileMap = new Map<string, any[]>();

          // Wait for all PR file loads to complete
          await Promise.all(
            openPRs.map(async pr => {
              try {
                console.log(`Loading files for PR #${pr.number}...`);
                const filesResponse = await fetch(
                  `/api/git/v1/repos/${repository.fullName}/pulls/${pr.number}/files/`,
                  { credentials: 'include' }
                );
                if (filesResponse.ok) {
                  const filesData = await filesResponse.json();
                  const files = filesData.items || [];
                  console.log(`  PR #${pr.number} has ${files.length} changed files`);

                  // Add this PR to the map for each file it modifies
                  for (const file of files) {
                    if (!fileMap.has(file.path)) {
                      fileMap.set(file.path, []);
                    }
                    fileMap.get(file.path)!.push({ pr, file });
                  }
                } else {
                  console.error(
                    `  Failed to load files for PR #${pr.number}, status:`,
                    filesResponse.status
                  );
                }
              } catch (error) {
                console.error(`Failed to load files for PR #${pr.number}:`, error);
              }
            })
          );

          setPRFileMap(fileMap);
        } else {
          console.error('Failed to fetch PRs, status:', response.status);
        }
      } catch (error) {
        console.error('Failed to load open PRs:', error);
      } finally {
        setIsPRMapLoading(false);
      }
    };

    loadOpenPRs();
  }, [repository.fullName, currentBranch]);

  // Load comment counts for entire repo once on mount or when branch changes
  useEffect(() => {
    if (!currentBranch) {
      return;
    }

    const loadCommentCounts = async () => {
      const [projectKey, repoSlug] = repository.id.split('_');

      try {
        const params = new URLSearchParams({
          git_provider: 'bitbucket_server',
          project_key: projectKey,
          repo_slug: repoSlug,
          branch: currentBranch,
        });

        const response = await fetch(`/api/wiki/repo-comment-counts/?${params.toString()}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const counts = await response.json();
          setFileCommentCounts(counts);
        }
      } catch (error) {
        console.error('Failed to load comment counts:', error);
      }
    };

    loadCommentCounts();
  }, [repository.id, currentBranch]);

  // Load file content when selectedFile changes (from tree navigation or directory click)
  useEffect(() => {
    if (!selectedFile || !currentBranch) {
      return;
    }

    const loadFileContent = async () => {
      setIsLoading(true);
      try {
        // Fetch actual file content from backend
        const data = await gitProviderApi.getFileContent(
          repository.id,
          selectedFile.path,
          currentBranch
        );

        const content = data.content || '';

        // If file is empty, show a helpful message
        if (content.trim() === '') {
          setFileContent('_This file is empty_');
        } else {
          setFileContent(content);
        }

        // Check if this file is in any open PR and load diff highlights from ALL PRs
        const prsForFile = prFileMap.get(selectedFile.path);
        if (prsForFile && prsForFile.length > 0) {
          const allDiffs: any[] = [];

          // Load diff data from all PRs
          for (const prInfo of prsForFile) {
            try {
              const diffResponse = await fetch(
                `/api/git/v1/repos/${repository.fullName}/pulls/${prInfo.pr.number}/diff/?file_path=${encodeURIComponent(selectedFile.path)}`,
                { credentials: 'include' }
              );
              if (diffResponse.ok) {
                const diffData = await diffResponse.json();
                allDiffs.push({
                  pr: prInfo.pr,
                  diff: diffData,
                });
              }
            } catch (error) {
              console.error(`Failed to load diff for PR #${prInfo.pr.number}:`, error);
            }
          }

          if (allDiffs.length > 0) {
            setAllPRDiffs(allDiffs);
            setCurrentPRIndex(0);
            setPRDiffData(allDiffs[0]);
          } else {
            setAllPRDiffs([]);
            setPRDiffData(null);
          }
        } else {
          setAllPRDiffs([]);
          setPRDiffData(null);
        }

        // Load comments for this file
        const [projectKey, repoSlug] = repository.id.split('_');
        try {
          const comments = await commentsApi.list({
            git_provider: 'bitbucket_server',
            project_key: projectKey,
            repo_slug: repoSlug,
            branch: currentBranch,
            file_path: selectedFile.path,
          });
          setFileComments(comments);
        } catch (error) {
          console.error('Failed to load comments:', error);
          setFileComments([]);
        }
      } catch (error) {
        console.error('Failed to load file content:', error);
        setFileContent('# Error\n\nFailed to load file content.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [selectedFile, currentBranch, repository.id, repository.fullName, prFileMap]);

  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      // File content will be loaded by the useEffect above
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) {
      return '-';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePRClick = async (pr: any) => {
    setSelectedPR(pr);
    setShowComments(true);
  };

  const getLineChangeInfo = (
    lineNumber: number
  ): { type: 'add' | 'delete'; oldLine: number | null; newLine: number | null } | null => {
    if (!prDiffData || !prDiffData.hunks) {
      return null;
    }
    for (const hunk of prDiffData.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && line.new_line_number === lineNumber) {
          return { type: 'add', oldLine: null, newLine: line.new_line_number };
        }
        if (line.type === 'delete' && line.old_line_number === lineNumber) {
          return { type: 'delete', oldLine: line.old_line_number, newLine: null };
        }
      }
    }
    return null;
  };

  const getLineChangeType = (lineNumber: number): 'add' | 'delete' | null => {
    const info = getLineChangeInfo(lineNumber);
    return info?.type || null;
  };

  const isFileChangedInPR = (filePath: string): boolean => {
    return prFileMap.has(filePath);
  };

  const getFileChangeType = (filePath: string): 'added' | 'deleted' | 'modified' | null => {
    const prsForFile = prFileMap.get(filePath);
    if (!prsForFile || prsForFile.length === 0) {
      return null;
    }

    // If file has multiple PRs, prioritize deleted > added > modified
    const types = prsForFile.map(p => p.file.change_type);
    if (types.includes('deleted')) {
      return 'deleted';
    }
    if (types.includes('added')) {
      return 'added';
    }
    return 'modified';
  };

  const _isFolderContainsPRChanges = (folderPath: string): boolean => {
    const normalizedPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
    for (const filePath of prFileMap.keys()) {
      if (filePath.startsWith(normalizedPath)) {
        return true;
      }
    }
    return false;
  };

  const getPRNumbersForPath = (path: string, isDirectory: boolean): number[] => {
    const prNumbers = new Set<number>();
    // path is relative to current directory, but prFileMap uses full paths from root
    // So we need to use the full path when checking
    const fullPath = path; // path already contains the full path from root

    if (isDirectory) {
      const normalizedPath = fullPath.endsWith('/') ? fullPath : fullPath + '/';

      for (const [filePath, prsForFile] of prFileMap.entries()) {
        if (filePath.startsWith(normalizedPath) || filePath === fullPath) {
          prsForFile.forEach(p => prNumbers.add(p.pr.number));
        }
      }
    } else {
      const prsForFile = prFileMap.get(fullPath);
      if (prsForFile) {
        prsForFile.forEach(p => prNumbers.add(p.pr.number));
      }
    }
    return Array.from(prNumbers).sort((a, b) => a - b);
  };

  if (selectedFile) {
    // Parse project key and repo slug from repository ID
    const [_projectKey, _repoSlug] = repository.id.split('_');

    return (
      <div className="h-screen flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div
            className="border-b px-6 py-4"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {repository.fullName}
              </h1>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                /
              </span>
              <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                {currentPath}
              </span>
              <button
                onClick={() => setShowComments(!showComments)}
                className="ml-auto p-2 rounded hover:opacity-70 transition-opacity"
                style={{ color: showComments ? 'var(--primary)' : 'var(--text-secondary)' }}
                title="Toggle comments"
              >
                <MessageSquare size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                  }}
                  className="text-sm px-3 py-1.5 rounded-md hover:shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  ← Back to files
                </button>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatSize(selectedFile.size)}
                </span>
              </div>

              {allPRDiffs.length > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    PR Changes:
                  </span>
                  <button
                    onClick={() => {
                      const newIndex = (currentPRIndex - 1 + allPRDiffs.length) % allPRDiffs.length;
                      setCurrentPRIndex(newIndex);
                      setPRDiffData(allPRDiffs[newIndex]);
                    }}
                    className="p-1 rounded hover:bg-opacity-70 transition-all"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    title="Previous PR"
                  >
                    <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                  </button>
                  <div className="flex items-center gap-2">
                    {allPRDiffs.map((diff, index) => (
                      <button
                        key={diff.pr.number}
                        onClick={() => {
                          setCurrentPRIndex(index);
                          setPRDiffData(allPRDiffs[index]);
                        }}
                        className="px-2 py-1 rounded text-xs font-medium transition-all"
                        style={{
                          backgroundColor: index === currentPRIndex ? '#1976d2' : '#e3f2fd',
                          color: index === currentPRIndex ? 'white' : '#1976d2',
                        }}
                      >
                        #{diff.pr.number}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const newIndex = (currentPRIndex + 1) % allPRDiffs.length;
                      setCurrentPRIndex(newIndex);
                      setPRDiffData(allPRDiffs[newIndex]);
                    }}
                    className="p-1 rounded hover:bg-opacity-70 transition-all"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    title="Next PR"
                  >
                    <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Content */}
          <FileContentWithModes
            fileName={selectedFile.name}
            fileContent={fileContent}
            fileComments={fileComments}
            prDiffData={prDiffData}
            repository={repository}
            filePath={selectedFile.path}
            fileSize={selectedFile.size}
            onLineClick={lineNumber => {
              const changeType = getLineChangeType(lineNumber);

              // For added lines, only show PR info (no commenting)
              if (changeType === 'add') {
                if (prDiffData && prDiffData.pr) {
                  setSelectedLines(null);
                  setShowComments(true);
                }
                return;
              }

              // For deleted/unchanged lines, allow commenting
              setSelectedLines({ start: lineNumber, end: lineNumber });

              // If line has PR changes, also show PR info
              if (changeType && prDiffData && prDiffData.pr) {
                setSelectedPR(prDiffData.pr);
              } else {
                setSelectedPR(null);
              }

              setShowComments(true);
            }}
          />
        </div>

        {/* Comments Panel */}
        {showComments && (
          <CommentsPanel
            gitProvider="bitbucket_server"
            projectKey={_projectKey}
            repoSlug={_repoSlug}
            branch={currentBranch!}
            filePath={selectedFile.path}
            fileContent={fileContent}
            selectedLines={selectedLines}
            pullRequest={_selectedPR}
            onClose={() => {
              setShowComments(false);
              setSelectedLines(null);
              setSelectedPR(null);
            }}
            onCommentsChange={async () => {
              // Refresh file comments after change
              if (selectedFile && currentBranch) {
                const [projectKey, repoSlug] = repository.id.split('_');
                try {
                  const comments = await commentsApi.list({
                    git_provider: 'bitbucket_server',
                    project_key: projectKey,
                    repo_slug: repoSlug,
                    branch: currentBranch,
                    file_path: selectedFile.path,
                  });
                  setFileComments(comments);
                } catch (error) {
                  console.error('Failed to reload comments:', error);
                }
              }
            }}
            onNavigateToLine={lineNumber => {
              // Update selected lines to the target line
              setSelectedLines({ start: lineNumber, end: lineNumber });

              // Scroll to the line
              const lineElement = document.querySelector(`[data-line-number="${lineNumber}"]`);
              if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-3"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {repository.fullName}
          </h1>
          {currentPath && (
            <>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                /
              </span>
              <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                {currentPath}
              </span>
            </>
          )}
          <button
            onClick={() => onToggleFavorite(repository.id)}
            className="ml-auto p-2 rounded hover:opacity-70 transition-opacity"
            style={{ color: isFavorite ? 'var(--warning)' : 'var(--text-secondary)' }}
          >
            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setActiveTab('source')}
            className="px-4 py-2 text-sm font-semibold border-b-2 transition-colors"
            style={{
              color: activeTab === 'source' ? 'var(--primary)' : 'var(--text-secondary)',
              borderColor: activeTab === 'source' ? 'var(--primary)' : 'transparent',
            }}
          >
            Source
          </button>
          <button
            onClick={() => setActiveTab('pull-requests')}
            className="px-4 py-2 text-sm font-semibold border-b-2 transition-colors"
            style={{
              color: activeTab === 'pull-requests' ? 'var(--primary)' : 'var(--text-secondary)',
              borderColor: activeTab === 'pull-requests' ? 'var(--primary)' : 'transparent',
            }}
          >
            Pull Requests
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'pull-requests' ? (
        <PullRequestsTab
          repositoryId={repository.id}
          repositoryFullName={repository.fullName}
          onPRClick={handlePRClick}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Branch selector and breadcrumb */}
          <div
            className="flex items-center gap-3 px-6 py-3 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {currentPath && (
              <button
                onClick={() => {
                  const pathParts = currentPath.split('/');
                  pathParts.pop();
                  setCurrentPath(pathParts.join('/'));
                }}
                className="text-sm px-3 py-1 rounded hover:bg-opacity-80 transition-colors"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                ← Back
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm hover:bg-opacity-80 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <GitBranch size={14} />
                {currentBranch}
                <ChevronDown size={14} />
              </button>

              {showBranchDropdown && _branches.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[200px] max-h-[300px] overflow-y-auto"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                  }}
                >
                  {_branches.map((branch: any) => (
                    <button
                      key={branch.name}
                      onClick={() => {
                        setCurrentBranch(branch.name);
                        setShowBranchDropdown(false);
                        setCurrentPath(''); // Reset path when switching branches
                      }}
                      className="px-4 py-2 hover:bg-opacity-80 cursor-pointer transition-all flex items-center justify-between rounded"
                      style={{
                        backgroundColor:
                          branch.name === currentBranch ? 'var(--bg-secondary)' : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <GitBranch size={12} />
                      {branch.name}
                      {branch.isDefault && (
                        <span
                          className="ml-auto text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                          }}
                        >
                          default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Browser */}
          <div className="flex-1 overflow-auto">
            {/* File list header */}
            <div
              className="grid grid-cols-12 gap-4 px-6 py-2 border-b text-xs font-medium"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <div className="col-span-4">Source</div>
              <div className="col-span-2 text-center">PRs</div>
              <div className="col-span-1 text-center">Comments</div>
              <div className="col-span-2 text-right">Size</div>
              <div className="col-span-2 text-right">Last Modified</div>
              <div className="col-span-1 text-right">Modified By</div>
            </div>

            {/* File list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <div
                    className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                    style={{ borderColor: 'var(--primary)' }}
                  ></div>
                  <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                    Loading repository content...
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                    Please wait while we fetch the files
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {files.map((file, index) => {
                  const isChanged = isFileChangedInPR(file.path);
                  const changeType = file.isPhantom ? 'added' : getFileChangeType(file.path);
                  const folderHasPRChanges =
                    file.type === 'directory' && _isFolderContainsPRChanges(file.path);
                  const showWarningBadge = isChanged || folderHasPRChanges;
                  const prNumbers = getPRNumbersForPath(file.path, file.type === 'directory');

                  // Style for added/deleted files (including phantoms)
                  const isAddedOrDeleted =
                    file.isPhantom || changeType === 'added' || changeType === 'deleted';
                  const fileOpacity = isAddedOrDeleted ? 0.5 : 1;
                  const fileStyle = isAddedOrDeleted ? 'italic' : 'normal';

                  return (
                    <button
                      key={`${file.path}-${index}`}
                      onClick={() => handleFileClick(file)}
                      className="w-full grid grid-cols-12 gap-4 px-6 py-3 text-sm border-b hover:bg-opacity-50 transition-colors text-left"
                      style={{
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div
                        className="col-span-4 flex items-center gap-2"
                        style={{ opacity: fileOpacity, fontStyle: fileStyle }}
                      >
                        {file.type === 'directory' ? (
                          <Folder size={16} style={{ color: 'var(--primary)' }} />
                        ) : (
                          <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                        )}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className={file.type === 'directory' ? 'font-medium' : ''}>
                            {file.name}
                          </span>
                          {changeType === 'added' && (
                            <span
                              className="text-xs px-1 rounded"
                              style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                              title="Added in PR"
                            >
                              NEW
                            </span>
                          )}
                          {changeType === 'deleted' && (
                            <span
                              className="text-xs px-1 rounded"
                              style={{ backgroundColor: '#ffebee', color: '#c62828' }}
                              title="Deleted in PR"
                            >
                              DEL
                            </span>
                          )}
                          {showWarningBadge && changeType === 'modified' && (
                            <span title="Modified in PR">
                              <AlertTriangle size={12} style={{ color: '#f57c00' }} />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        {isPRMapLoading ? (
                          <Loader
                            size={14}
                            className="animate-spin mx-auto"
                            style={{ color: 'var(--text-secondary)' }}
                          />
                        ) : (
                          prNumbers.length > 0 && (
                            <div className="flex items-center justify-center gap-0.5">
                              {prNumbers.map(prNum => (
                                <a
                                  key={prNum}
                                  href={`https://git.acronis.work/projects/REAL/repos/cyber-repo/pull-requests/${prNum}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center px-1 py-0.5 rounded text-xs whitespace-nowrap hover:opacity-80 transition-opacity"
                                  style={{
                                    backgroundColor: '#e3f2fd',
                                    color: '#1976d2',
                                    textDecoration: 'none',
                                  }}
                                >
                                  #{prNum}
                                </a>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        {file.type === 'file' && fileCommentCounts[file.path] > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                            }}
                          >
                            <MessageSquare size={12} />
                            {fileCommentCounts[file.path]}
                          </span>
                        )}
                      </div>
                      <div
                        className="col-span-2 text-right"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {file.type === 'file' ? formatSize(file.size) : '-'}
                      </div>
                      <div
                        className="col-span-2 text-right text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {file.lastModified ? new Date(file.lastModified).toLocaleString() : '-'}
                      </div>
                      <div
                        className="col-span-1 text-right text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {file.lastAuthor || '-'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
