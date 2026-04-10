/**
 * EnrichmentPanel Component
 *
 * Displays enrichment details and available actions
 */

import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  Enrichment,
  executeEnrichmentAction,
  getEnrichmentActions,
  EnrichmentAction,
} from '../../services/enrichmentProviderApi';

interface EnrichmentPanelProps {
  enrichment: Enrichment;
  onActionExecuted?: (action: string, result: any) => void;
  onClose?: () => void;
}

export const EnrichmentPanel: React.FC<EnrichmentPanelProps> = ({
  enrichment,
  onActionExecuted,
  onClose,
}) => {
  const [actions, setActions] = useState<EnrichmentAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInput, setActionInput] = useState<Record<string, any>>({});
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Load actions on mount
  React.useEffect(() => {
    if (enrichment.actions.length > 0) {
      getEnrichmentActions(enrichment.id).then(setActions).catch(console.error);
    }
  }, [enrichment.id, enrichment.actions]);

  const handleExecuteAction = async (action: string) => {
    setLoading(true);
    try {
      const params = actionInput[action] || {};
      const result = await executeEnrichmentAction(enrichment.id, action, params);

      if (result.success) {
        onActionExecuted?.(action, result);
        setSelectedAction(null);
        setActionInput({});
      } else {
        alert(result.message || 'Action failed');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = (action: EnrichmentAction) => {
    const IconComponent = action.icon
      ? (LucideIcons as any)[
          action.icon
            .split('-')
            .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
            .join('')
        ]
      : null;

    return (
      <button
        key={action.action}
        onClick={() => {
          if (action.requires_input) {
            setSelectedAction(action.action);
          } else {
            handleExecuteAction(action.action);
          }
        }}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {IconComponent && <IconComponent size={16} />}
        <span>{action.label}</span>
      </button>
    );
  };

  const renderActionInput = (action: EnrichmentAction) => {
    if (!action.input_schema) {
      return null;
    }

    const properties = action.input_schema.properties || {};

    return (
      <div className="mt-4 p-4 border border-gray-300 rounded">
        <h4 className="font-medium mb-3">{action.label}</h4>

        {Object.entries(properties).map(([key, schema]: [string, any]) => (
          <div key={key} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            {schema.type === 'string' && (
              <textarea
                value={actionInput[action.action]?.[key] || ''}
                onChange={e =>
                  setActionInput({
                    ...actionInput,
                    [action.action]: {
                      ...actionInput[action.action],
                      [key]: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button
            onClick={() => handleExecuteAction(action.action)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Executing...' : 'Submit'}
          </button>
          <button
            onClick={() => {
              setSelectedAction(null);
              setActionInput({});
            }}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-500 uppercase">
              {enrichment.type.replace('_', ' ')}
            </span>
            {enrichment.visual.label && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                {enrichment.visual.label}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            by {enrichment.created_by} • {new Date(enrichment.created_at).toLocaleDateString()}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <LucideIcons.X size={20} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        {enrichment.type === 'comment' && (
          <div>
            <p className="text-gray-800 whitespace-pre-wrap">{enrichment.data.text}</p>
            {enrichment.data.reply_count > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {enrichment.data.reply_count}{' '}
                {enrichment.data.reply_count === 1 ? 'reply' : 'replies'}
              </div>
            )}
          </div>
        )}

        {enrichment.type === 'pr_diff' && (
          <div>
            <h4 className="font-medium mb-2">
              PR #{enrichment.data.pr_number}: {enrichment.data.pr_title}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              by {enrichment.data.pr_author} • {enrichment.data.pr_source_branch} →{' '}
              {enrichment.data.pr_target_branch}
            </p>
            <div className="text-xs px-2 py-1 rounded bg-gray-100 inline-block">
              {enrichment.data.change_type}
            </div>
          </div>
        )}

        {enrichment.type === 'local_change' && (
          <div>
            <h4 className="font-medium mb-2">Uncommitted Changes</h4>
            <div className="text-xs px-2 py-1 rounded bg-yellow-100 inline-block">
              {enrichment.data.change_type}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-2">{actions.map(renderActionButton)}</div>

          {selectedAction && renderActionInput(actions.find(a => a.action === selectedAction)!)}
        </div>
      )}
    </div>
  );
};

export default EnrichmentPanel;
