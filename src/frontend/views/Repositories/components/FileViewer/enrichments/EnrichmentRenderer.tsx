/**
 * EnrichmentRenderer
 *
 * Base interface and utilities for rendering enrichments across all formats
 */

import React from 'react';
import { MessageSquare, GitPullRequest, AlertCircle, Info, Highlighter } from 'lucide-react';
import { Enrichment, EnrichmentVisual } from './types';

/**
 * Get icon component for enrichment type
 */
export function getEnrichmentIcon(enrichment: Enrichment): React.ComponentType<any> {
  if (enrichment.visual.icon) {
    // TODO: Map icon name to Lucide component
    return MessageSquare;
  }

  switch (enrichment.type) {
    case 'comment':
      return MessageSquare;
    case 'diff':
      return GitPullRequest;
    case 'annotation':
      return enrichment.data.severity === 'error'
        ? AlertCircle
        : enrichment.data.severity === 'warning'
          ? AlertCircle
          : Info;
    case 'highlight':
      return Highlighter;
    default:
      return Info;
  }
}

/**
 * Get color classes for enrichment
 */
export function getEnrichmentColorClasses(visual: EnrichmentVisual): {
  bg: string;
  border: string;
  text: string;
} {
  const colorMap: Record<EnrichmentVisual['color'], { bg: string; border: string; text: string }> =
    {
      blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
      green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
      red: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
      yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
      orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
      purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
      gray: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' },
    };

  return colorMap[visual.color] || colorMap.gray;
}

/**
 * Render enrichment marker based on type
 */
interface EnrichmentMarkerProps {
  enrichment: Enrichment;
  onClick?: () => void;
  className?: string;
}

export function EnrichmentMarker({ enrichment, onClick, className = '' }: EnrichmentMarkerProps) {
  const Icon = getEnrichmentIcon(enrichment);
  const colors = getEnrichmentColorClasses(enrichment.visual);

  switch (enrichment.visual.markerType) {
    case 'badge':
      return (
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${colors.bg} ${colors.border} ${colors.text} ${className}`}
          onClick={onClick}
          title={enrichment.visual.tooltip}
        >
          <Icon size={14} />
          {enrichment.visual.label && (
            <span className="text-xs font-medium">{enrichment.visual.label}</span>
          )}
        </div>
      );

    case 'gutter':
      return (
        <div
          className={`flex items-center justify-center w-6 h-6 rounded cursor-pointer hover:opacity-80 transition-opacity ${colors.bg} ${colors.border} ${className}`}
          onClick={onClick}
          title={enrichment.visual.tooltip}
        >
          <Icon size={16} />
        </div>
      );

    case 'inline':
      return (
        <button
          onClick={onClick}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:opacity-80 transition-opacity ${colors.bg} ${colors.text} ${className}`}
          title={enrichment.visual.tooltip}
        >
          <Icon size={12} />
          {enrichment.visual.label && <span>{enrichment.visual.label}</span>}
        </button>
      );

    case 'highlight':
      return (
        <div
          className={`absolute inset-0 opacity-20 pointer-events-none ${colors.bg} ${className}`}
          title={enrichment.visual.tooltip}
        />
      );

    case 'underline':
      return (
        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 ${colors.bg} ${className}`}
          title={enrichment.visual.tooltip}
        />
      );

    case 'overlay':
      return (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-opacity-90 ${colors.bg} ${className}`}
          onClick={onClick}
        >
          <Icon size={24} />
          {enrichment.visual.label && (
            <span className="ml-2 font-medium">{enrichment.visual.label}</span>
          )}
        </div>
      );

    default:
      return null;
  }
}

/**
 * Render enrichment count badge
 */
interface EnrichmentCountBadgeProps {
  count: number;
  type: Enrichment['type'];
  onClick?: () => void;
}

export function EnrichmentCountBadge({ count, type, onClick }: EnrichmentCountBadgeProps) {
  const Icon = type === 'comment' ? MessageSquare : type === 'diff' ? GitPullRequest : Info;
  const colorClass =
    type === 'comment'
      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
      : type === 'diff'
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${colorClass} transition-colors`}
    >
      <Icon size={12} />
      <span>{count}</span>
    </button>
  );
}
