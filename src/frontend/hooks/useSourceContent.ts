/**
 * useSourceContent Hook
 *
 * React hook for fetching source content with enrichments
 */

import { useState, useEffect, useCallback } from 'react';
import { SourceContent, getContentByUri } from '../services/sourceProviderApi';
import { Enrichment, getEnrichments } from '../services/enrichmentProviderApi';

interface UseSourceContentOptions {
  sourceUri: string;
  loadEnrichments?: boolean;
  enrichmentTypes?: string[];
}

interface UseSourceContentResult {
  content: SourceContent | null;
  enrichments: Enrichment[];
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useSourceContent({
  sourceUri,
  loadEnrichments = true,
  enrichmentTypes,
}: UseSourceContentOptions): UseSourceContentResult {
  const [content, setContent] = useState<SourceContent | null>(null);
  const [enrichments, setEnrichments] = useState<Enrichment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load source content
      const sourceContent = await getContentByUri(sourceUri);
      setContent(sourceContent);

      // Load enrichments if enabled
      if (loadEnrichments) {
        const allEnrichments: Enrichment[] = [];

        if (enrichmentTypes && enrichmentTypes.length > 0) {
          // Load specific types
          for (const type of enrichmentTypes) {
            const items = await getEnrichments(sourceUri, type);
            allEnrichments.push(...items);
          }
        } else {
          // Load all types
          const items = await getEnrichments(sourceUri);
          allEnrichments.push(...items);
        }

        setEnrichments(allEnrichments);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [sourceUri, loadEnrichments, enrichmentTypes]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    content,
    enrichments,
    loading,
    error,
    reload: load,
  };
}

export default useSourceContent;
