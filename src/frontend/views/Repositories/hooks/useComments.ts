import { useState, useEffect, useCallback } from 'react';
import { commentsApi, FileComment } from '../../../services/commentsApi';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export function useComments(
  repositoryId: string,
  currentBranch: string,
  selectedFile: FileItem | null
) {
  const [fileComments, setFileComments] = useState<FileComment[]>([]);
  const [fileCommentCounts, setFileCommentCounts] = useState<Record<string, number>>({});

  const loadFileComments = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    const [projectKey, repoSlug] = repositoryId.split('_');
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
    }
  }, [repositoryId, currentBranch, selectedFile]);

  useEffect(() => {
    loadFileComments();
  }, [loadFileComments]);

  return {
    fileComments,
    fileCommentCounts,
    setFileComments,
    setFileCommentCounts,
    reloadComments: loadFileComments,
  };
}
