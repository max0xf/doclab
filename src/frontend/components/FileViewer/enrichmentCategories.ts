/**
 * Enrichment Categories and Types
 *
 * These match the backend enrichment system.
 */

export const EnrichmentCategory = {
  REFERENCE: 'reference', // Points to a line without modifying it (comments)
  DIFF: 'diff', // Modifies content by adding/removing lines (PR diffs, commits, edits)
} as const;

export type EnrichmentCategoryType = (typeof EnrichmentCategory)[keyof typeof EnrichmentCategory];

export type EnrichmentType =
  // Reference enrichments - don't modify content
  | 'comments'
  | 'local_changes'
  // Diff enrichments - modify content
  | 'pr_diff'
  | 'commit'
  | 'edit_session'
  | 'diff';

export interface EnrichmentMetadata {
  type: EnrichmentType;
  category: EnrichmentCategoryType;
}

/**
 * Fetch enrichment metadata from backend
 */
export async function fetchEnrichmentMetadata(): Promise<
  Record<EnrichmentType, EnrichmentMetadata>
> {
  const response = await fetch('/api/enrichments/v1/enrichments/metadata/');
  if (!response.ok) {
    throw new Error('Failed to fetch enrichment metadata');
  }
  return response.json();
}
