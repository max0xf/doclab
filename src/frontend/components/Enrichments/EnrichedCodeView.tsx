/**
 * EnrichedCodeView Component
 *
 * Displays code with enrichments overlaid (comments, PR diffs, local changes)
 */

import React, { useState, useEffect } from 'react';
import {
  Enrichment,
  getEnrichments,
  groupEnrichmentsByLine,
  sortEnrichmentsByPriority,
} from '../../services/enrichmentProviderApi';
import EnrichmentMarker from './EnrichmentMarker';
import EnrichmentPanel from './EnrichmentPanel';

interface EnrichedCodeViewProps {
  sourceUri: string;
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  enabledEnrichmentTypes?: string[];
  onEnrichmentAction?: (enrichmentId: string, action: string, result: any) => void;
}

export const EnrichedCodeView: React.FC<EnrichedCodeViewProps> = ({
  sourceUri,
  content,
  language: _language = 'text',
  showLineNumbers = true,
  enabledEnrichmentTypes,
  onEnrichmentAction,
}) => {
  const [_enrichments, setEnrichments] = useState<Enrichment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrichment, setSelectedEnrichment] = useState<Enrichment | null>(null);
  const [enrichmentsByLine, setEnrichmentsByLine] = useState<Map<number, Enrichment[]>>(new Map());

  // Load enrichments
  useEffect(() => {
    setLoading(true);
    getEnrichments(sourceUri)
      .then(items => {
        // Filter by enabled types if specified
        let filtered = items;
        if (enabledEnrichmentTypes) {
          filtered = items.filter(e => enabledEnrichmentTypes.includes(e.type));
        }

        // Sort by priority
        const sorted = sortEnrichmentsByPriority(filtered);
        setEnrichments(sorted);

        // Group by line
        const grouped = groupEnrichmentsByLine(sorted);
        setEnrichmentsByLine(grouped);
      })
      .catch(error => {
        console.error('Failed to load enrichments:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sourceUri, enabledEnrichmentTypes]);

  const handleEnrichmentClick = (enrichment: Enrichment) => {
    setSelectedEnrichment(enrichment);
  };

  const handleActionExecuted = (action: string, result: any) => {
    onEnrichmentAction?.(selectedEnrichment!.id, action, result);

    // Reload enrichments after action
    getEnrichments(sourceUri).then(items => {
      const sorted = sortEnrichmentsByPriority(items);
      setEnrichments(sorted);
      setEnrichmentsByLine(groupEnrichmentsByLine(sorted));
    });

    setSelectedEnrichment(null);
  };

  // Split content into lines
  const lines = content.split('\n');

  return (
    <div className="relative">
      {/* Code view */}
      <div className="font-mono text-sm bg-gray-50 border border-gray-300 rounded overflow-auto">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const lineEnrichments = enrichmentsByLine.get(lineNumber) || [];

          return (
            <div key={lineNumber} className="relative flex hover:bg-gray-100 transition-colors">
              {/* Line number */}
              {showLineNumbers && (
                <div className="flex-shrink-0 w-12 px-2 py-1 text-right text-gray-500 select-none border-r border-gray-300">
                  {lineNumber}
                </div>
              )}

              {/* Gutter for enrichment markers */}
              <div className="flex-shrink-0 w-8 px-1 py-1 flex items-center justify-center">
                {lineEnrichments.length > 0 && (
                  <div className="relative">
                    {lineEnrichments
                      .filter(e => e.visual.marker_type === 'gutter')
                      .slice(0, 1)
                      .map(enrichment => (
                        <EnrichmentMarker
                          key={enrichment.id}
                          enrichment={enrichment}
                          onClick={() => handleEnrichmentClick(enrichment)}
                        />
                      ))}
                  </div>
                )}
              </div>

              {/* Code content */}
              <div className="flex-1 px-2 py-1 relative">
                {/* Highlight enrichments */}
                {lineEnrichments
                  .filter(e => e.visual.marker_type === 'highlight')
                  .map(enrichment => (
                    <EnrichmentMarker key={enrichment.id} enrichment={enrichment} />
                  ))}

                {/* Code text */}
                <pre className="relative z-10">{line || ' '}</pre>

                {/* Badge enrichments */}
                {lineEnrichments.filter(e => e.visual.marker_type === 'badge').length > 0 && (
                  <div className="absolute right-2 top-1 flex gap-1">
                    {lineEnrichments
                      .filter(e => e.visual.marker_type === 'badge')
                      .map(enrichment => (
                        <EnrichmentMarker
                          key={enrichment.id}
                          enrichment={enrichment}
                          onClick={() => handleEnrichmentClick(enrichment)}
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enrichment panel */}
      {selectedEnrichment && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <EnrichmentPanel
            enrichment={selectedEnrichment}
            onActionExecuted={handleActionExecuted}
            onClose={() => setSelectedEnrichment(null)}
          />
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-gray-600">Loading enrichments...</div>
        </div>
      )}
    </div>
  );
};

export default EnrichedCodeView;
