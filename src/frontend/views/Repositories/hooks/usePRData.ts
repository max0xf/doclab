import { useState, useEffect } from 'react';

export function usePRData(repositoryFullName: string) {
  const [prFileMap, setPRFileMap] = useState<Map<string, any[]>>(new Map());
  const [isPRMapLoading, setIsPRMapLoading] = useState(true);

  useEffect(() => {
    const loadOpenPRs = async () => {
      setIsPRMapLoading(true);
      try {
        const response = await fetch(`/api/git/v1/repos/${repositoryFullName}/pulls/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const openPRs = data.items || [];

          // Load file changes for each PR to build the file map
          const fileMap = new Map<string, any[]>();
          for (const pr of openPRs) {
            try {
              const filesResponse = await fetch(
                `/api/git/v1/repos/${repositoryFullName}/pulls/${pr.number}/files/`,
                { credentials: 'include' }
              );
              if (filesResponse.ok) {
                const filesData = await filesResponse.json();
                const files = filesData.items || [];

                // Add this PR to the map for each file it modifies
                for (const file of files) {
                  if (!fileMap.has(file.path)) {
                    fileMap.set(file.path, []);
                  }
                  fileMap.get(file.path)!.push({ pr, file });
                }
              }
            } catch (error) {
              console.error(`Failed to load files for PR #${pr.number}:`, error);
            }
          }
          setPRFileMap(fileMap);
          console.log('Loaded open PRs and file map:', {
            openPRs: openPRs.length,
            filesInPRs: fileMap.size,
          });
        }
      } catch (error) {
        console.error('Failed to load open PRs:', error);
      } finally {
        setIsPRMapLoading(false);
      }
    };

    loadOpenPRs();
  }, [repositoryFullName]);

  return { prFileMap, isPRMapLoading };
}
