/**
 * Enrichment Provider API Client
 *
 * Provides access to enrichments (comments, PR diffs, local changes, annotations)
 * that can be overlaid on source content.
 */

import { apiClient } from './apiClient';

const API_BASE = '/api/enrich/v1';

// Types

export interface RawMapping {
  start_line: number;
  end_line: number;
  start_column?: number | null;
  end_column?: number | null;
}

export interface RenderedMapping {
  block_type: string;
  block_id: string;
  node_path?: string[] | null;
  offset?: number | null;
}

export interface EnrichmentVisual {
  marker_type: 'badge' | 'highlight' | 'underline' | 'gutter' | 'overlay';
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  icon?: string | null;
  label?: string | null;
  tooltip?: string | null;
  css_class?: string | null;
  priority: number;
}

export interface Enrichment {
  id: string;
  type: string;
  source_address: string;
  raw_mapping: RawMapping | null;
  rendered_mapping: RenderedMapping | null;
  data: Record<string, any>;
  visual: EnrichmentVisual;
  actions: string[];
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface EnrichmentProvider {
  type: string;
  name: string;
  supports_actions: boolean;
}

export interface EnrichmentAction {
  action: string;
  label: string;
  icon?: string | null;
  requires_input: boolean;
  input_schema?: Record<string, any> | null;
}

export interface ActionResult {
  success: boolean;
  message?: string | null;
  data: Record<string, any>;
}

// API Functions

/**
 * List available enrichment providers
 */
export async function listEnrichmentProviders(): Promise<EnrichmentProvider[]> {
  const response = await apiClient.request<{ items: EnrichmentProvider[] }>(
    `${API_BASE}/providers/`
  );
  return response.items;
}

/**
 * Get enrichments for a source
 */
export async function getEnrichments(sourceUri: string, type?: string): Promise<Enrichment[]> {
  const params = new URLSearchParams({ source_uri: sourceUri });
  if (type) {
    params.append('type', type);
  }

  const url = `${API_BASE}/enrichments/?${params.toString()}`;
  const response = await apiClient.request<{ items: Enrichment[] }>(url);
  return response.items;
}

/**
 * Get specific enrichment by ID
 */
export async function getEnrichment(enrichmentId: string): Promise<Enrichment> {
  return apiClient.request<Enrichment>(`${API_BASE}/enrichments/${enrichmentId}/`);
}

/**
 * Get available actions for an enrichment
 */
export async function getEnrichmentActions(enrichmentId: string): Promise<EnrichmentAction[]> {
  const response = await apiClient.request<{ items: EnrichmentAction[] }>(
    `${API_BASE}/enrichments/${enrichmentId}/actions/`
  );
  return response.items;
}

/**
 * Execute an action on an enrichment
 */
export async function executeEnrichmentAction(
  enrichmentId: string,
  action: string,
  params: Record<string, any> = {}
): Promise<ActionResult> {
  return apiClient.request<ActionResult>(
    `${API_BASE}/enrichments/${enrichmentId}/actions/${action}/`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
}

/**
 * Create a new enrichment
 */
export async function createEnrichment(
  type: string,
  sourceUri: string,
  data: Record<string, any>,
  rawMapping?: RawMapping,
  renderedMapping?: RenderedMapping
): Promise<Enrichment> {
  const payload: any = {
    type,
    source_uri: sourceUri,
    data,
  };

  if (rawMapping) {
    payload.raw_mapping = rawMapping;
  }

  if (renderedMapping) {
    payload.rendered_mapping = renderedMapping;
  }

  return apiClient.request<Enrichment>(`${API_BASE}/enrichments/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Helper Functions

/**
 * Group enrichments by line number
 */
export function groupEnrichmentsByLine(enrichments: Enrichment[]): Map<number, Enrichment[]> {
  const grouped = new Map<number, Enrichment[]>();

  for (const enrichment of enrichments) {
    if (enrichment.raw_mapping) {
      for (
        let line = enrichment.raw_mapping.start_line;
        line <= enrichment.raw_mapping.end_line;
        line++
      ) {
        if (!grouped.has(line)) {
          grouped.set(line, []);
        }
        grouped.get(line)!.push(enrichment);
      }
    }
  }

  return grouped;
}

/**
 * Group enrichments by block ID
 */
export function groupEnrichmentsByBlock(enrichments: Enrichment[]): Map<string, Enrichment[]> {
  const grouped = new Map<string, Enrichment[]>();

  for (const enrichment of enrichments) {
    if (enrichment.rendered_mapping) {
      const blockId = enrichment.rendered_mapping.block_id;
      if (!grouped.has(blockId)) {
        grouped.set(blockId, []);
      }
      grouped.get(blockId)!.push(enrichment);
    }
  }

  return grouped;
}

/**
 * Filter enrichments by type
 */
export function filterEnrichmentsByType(enrichments: Enrichment[], type: string): Enrichment[] {
  return enrichments.filter(e => e.type === type);
}

/**
 * Sort enrichments by priority
 */
export function sortEnrichmentsByPriority(enrichments: Enrichment[]): Enrichment[] {
  return [...enrichments].sort((a, b) => {
    // Higher priority first
    if (a.visual.priority !== b.visual.priority) {
      return b.visual.priority - a.visual.priority;
    }
    // Then by created_at
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Get enrichment color CSS class
 */
export function getEnrichmentColorClass(color: string): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
    green: 'bg-green-100 border-green-300 text-green-800',
    red: 'bg-red-100 border-red-300 text-red-800',
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    purple: 'bg-purple-100 border-purple-300 text-purple-800',
    gray: 'bg-gray-100 border-gray-300 text-gray-800',
  };

  return colorMap[color] || colorMap.blue;
}
