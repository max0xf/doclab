import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RepositoryContextType {
  currentBranch: string | null;
  setCurrentBranch: (branch: string) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  // Sync with URL parameters
  useEffect(() => {
    const updateFromURL = () => {
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const path = params.get('path') || '';
      setCurrentPath(path);
    };

    updateFromURL();
    window.addEventListener('hashchange', updateFromURL);
    return () => window.removeEventListener('hashchange', updateFromURL);
  }, []);

  return (
    <RepositoryContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        currentPath,
        setCurrentPath,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
