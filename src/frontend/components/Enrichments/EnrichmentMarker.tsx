/**
 * EnrichmentMarker Component
 *
 * Renders a visual marker for an enrichment (badge, highlight, gutter icon, etc.)
 */

import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Enrichment, getEnrichmentColorClass } from '../../services/enrichmentProviderApi';

interface EnrichmentMarkerProps {
  enrichment: Enrichment;
  onClick?: () => void;
  className?: string;
}

export const EnrichmentMarker: React.FC<EnrichmentMarkerProps> = ({
  enrichment,
  onClick,
  className = '',
}) => {
  const { visual } = enrichment;
  const colorClass = getEnrichmentColorClass(visual.color);

  // Get icon component
  const IconComponent = visual.icon
    ? (LucideIcons as any)[
        visual.icon
          .split('-')
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('')
      ]
    : null;

  // Render based on marker type
  switch (visual.marker_type) {
    case 'badge':
      return (
        <div
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${colorClass} ${className}`}
          onClick={onClick}
          title={visual.tooltip || undefined}
        >
          {IconComponent && <IconComponent size={14} />}
          {visual.label && <span className="text-xs font-medium">{visual.label}</span>}
        </div>
      );

    case 'highlight':
      return (
        <div
          className={`absolute inset-0 opacity-20 pointer-events-none ${colorClass} ${className}`}
          title={visual.tooltip || undefined}
        />
      );

    case 'gutter':
      return (
        <div
          className={`flex items-center justify-center w-6 h-6 rounded cursor-pointer hover:opacity-80 transition-opacity ${colorClass} ${className}`}
          onClick={onClick}
          title={visual.tooltip || undefined}
        >
          {IconComponent && <IconComponent size={16} />}
        </div>
      );

    case 'underline':
      return (
        <div
          className={`absolute bottom-0 left-0 right-0 h-0.5 ${colorClass} ${className}`}
          title={visual.tooltip || undefined}
        />
      );

    case 'overlay':
      return (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-opacity-90 ${colorClass} ${className}`}
          onClick={onClick}
        >
          {IconComponent && <IconComponent size={24} />}
          {visual.label && <span className="ml-2 font-medium">{visual.label}</span>}
        </div>
      );

    default:
      return null;
  }
};

export default EnrichmentMarker;
