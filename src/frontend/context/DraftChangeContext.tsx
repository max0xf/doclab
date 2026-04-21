/**
 * Draft Change Context
 *
 * Provides state management for user draft changes (edits not yet committed to git).
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  DraftChangeListItem,
  listDraftChanges,
  saveDraftChange as saveDraftChangeApi,
  discardDraftChange as discardDraftChangeApi,
} from '../services/draftChangeApi';

interface DraftChangeContextType {
  draftChanges: DraftChangeListItem[];
  isLoading: boolean;
  error: string | null;
  loadDraftChanges: (spaceId?: string) => Promise<void>;
  saveChange: (
    spaceId: string,
    filePath: string,
    originalContent: string,
    modifiedContent: string,
    changeType?: 'modify' | 'create' | 'delete',
    description?: string
  ) => Promise<void>;
  discardChange: (changeId: string) => Promise<void>;
  getChangeForFile: (filePath: string) => DraftChangeListItem | undefined;
  hasUnsavedChanges: boolean;
}

const DraftChangeContext = createContext<DraftChangeContextType | null>(null);

export function useDraftChanges(): DraftChangeContextType {
  const context = useContext(DraftChangeContext);
  if (!context) {
    throw new Error('useDraftChanges must be used within a DraftChangeProvider');
  }
  return context;
}

interface DraftChangeProviderProps {
  children: ReactNode;
}

export function DraftChangeProvider({ children }: DraftChangeProviderProps): JSX.Element {
  const [draftChanges, setDraftChanges] = useState<DraftChangeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraftChanges = useCallback(async (spaceId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const changes = await listDraftChanges(spaceId);
      setDraftChanges(changes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load draft changes';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveChange = useCallback(
    async (
      spaceId: string,
      filePath: string,
      originalContent: string,
      modifiedContent: string,
      changeType: 'modify' | 'create' | 'delete' = 'modify',
      description?: string
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await saveDraftChangeApi(
          spaceId,
          filePath,
          originalContent,
          modifiedContent,
          changeType,
          description
        );
        // Reload changes to get updated list
        await loadDraftChanges(spaceId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save change';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadDraftChanges]
  );

  const discardChange = useCallback(async (changeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await discardDraftChangeApi(changeId);
      // Remove from local state
      setDraftChanges(prev => prev.filter(c => c.id !== changeId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discard change';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getChangeForFile = useCallback(
    (filePath: string): DraftChangeListItem | undefined => {
      return draftChanges.find(c => c.file_path === filePath);
    },
    [draftChanges]
  );

  const hasUnsavedChanges = draftChanges.length > 0;

  const value: DraftChangeContextType = {
    draftChanges,
    isLoading,
    error,
    loadDraftChanges,
    saveChange,
    discardChange,
    getChangeForFile,
    hasUnsavedChanges,
  };

  return <DraftChangeContext.Provider value={value}>{children}</DraftChangeContext.Provider>;
}
