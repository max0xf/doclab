import { useState, useEffect } from 'react';
import { gitProviderApi } from '../../../services/gitProviderApi';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
}

export function useFileContent(
  repositoryId: string,
  repositoryFullName: string,
  file: FileItem | null,
  currentBranch: string,
  prFileMap: Map<string, any[]>
) {
  const [fileContent, setFileContent] = useState('');
  const [allPRDiffs, setAllPRDiffs] = useState<any[]>([]);
  const [currentPRIndex, setCurrentPRIndex] = useState(0);
  const [prDiffData, setPRDiffData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setFileContent('');
      setAllPRDiffs([]);
      setCurrentPRIndex(0);
      setPRDiffData(null);
      return;
    }

    const loadFileContent = async () => {
      setIsLoading(true);
      try {
        // Fetch file content
        const data = await gitProviderApi.getFileContent(repositoryId, file.path, currentBranch);
        setFileContent(data.content);

        // Check if this file is in any open PR and load diff highlights from ALL PRs
        const prsForFile = prFileMap.get(file.path);
        if (prsForFile && prsForFile.length > 0) {
          const allDiffs: any[] = [];

          // Load diff data from all PRs
          for (const prInfo of prsForFile) {
            try {
              const diffResponse = await fetch(
                `/api/git/v1/repos/${repositoryFullName}/pulls/${prInfo.pr.number}/diff/?file_path=${encodeURIComponent(file.path)}`,
                { credentials: 'include' }
              );
              if (diffResponse.ok) {
                const diffData = await diffResponse.json();
                allDiffs.push({ ...diffData, pr: prInfo.pr });
              }
            } catch (error) {
              console.error(`Failed to load PR diff for PR #${prInfo.pr.number}:`, error);
            }
          }

          setAllPRDiffs(allDiffs);
          setCurrentPRIndex(0);

          // Set the first PR's diff as active
          if (allDiffs.length > 0) {
            setPRDiffData(allDiffs[0]);
          } else {
            setPRDiffData(null);
          }
        } else {
          setAllPRDiffs([]);
          setCurrentPRIndex(0);
          setPRDiffData(null);
        }
      } catch (error) {
        console.error('Failed to load file:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [file, repositoryId, repositoryFullName, currentBranch, prFileMap]);

  return {
    fileContent,
    allPRDiffs,
    currentPRIndex,
    prDiffData,
    isLoading,
    setCurrentPRIndex,
    setPRDiffData,
  };
}
