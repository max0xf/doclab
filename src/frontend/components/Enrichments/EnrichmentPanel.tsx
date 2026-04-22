import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  FileEdit,
  GitBranch,
  AlertCircle,
  Copy,
  Check,
  Edit3,
} from 'lucide-react';
import DiffViewer from '../main-view/sidebar/DiffViewer';
import { CommentsTab } from '../main-view/sidebar/CommentsTab';
import { PRBanner } from '../main-view/content/PRBanner';
import { ChangesTab } from '../main-view/sidebar/ChangesTab';
import type { EnrichmentsResponse } from '../../services/enrichmentApi';

interface EnrichmentPanelProps {
  enrichments: EnrichmentsResponse;
  fileName: string;
  filePath?: string;
  spaceId?: string;
  sourceUri: string;
  selectedLines: { start: number; end: number } | null;
  activeTab?: EnrichmentTab;
  onClose: () => void;
  onAcceptDiff?: (diffId: string) => void;
  onRejectDiff?: (diffId: string) => void;
  onCommentsChange?: () => void;
  onNavigateToFile?: (filePath: string) => void;
  onLog?: (msg: string, level?: 'info' | 'success' | 'error') => void;
}

export enum EnrichmentTab {
  ALL = 'all',
  COMMENTS = 'comments',
  DIFFS = 'diffs',
  PRS = 'prs',
  LOCAL = 'local',
  CHANGES = 'changes',
}

export default function EnrichmentPanel({
  enrichments,
  fileName,
  filePath,
  spaceId,
  sourceUri,
  selectedLines,
  activeTab: initialActiveTab = EnrichmentTab.ALL,
  onClose,
  onAcceptDiff,
  onRejectDiff,
  onCommentsChange,
  onNavigateToFile,
  onLog,
}: EnrichmentPanelProps) {
  const [activeTab, setActiveTab] = useState<EnrichmentTab>(initialActiveTab);
  const [copied, setCopied] = useState(false);

  // Count edit changes from enrichments
  const editChangesCount = (enrichments.edit?.length || 0) + (enrichments.commit?.length || 0);
  const hasUnsavedChanges = editChangesCount > 0;

  // Update activeTab when initialActiveTab prop changes (e.g., when user clicks a line)
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  const tabs: Array<{ id: EnrichmentTab; label: string; icon: React.ReactNode; count: number }> = [
    {
      id: EnrichmentTab.ALL,
      label: 'All',
      icon: <AlertCircle size={16} />,
      count:
        (enrichments.comments?.length || 0) +
        (enrichments.diff?.length || 0) +
        (enrichments.pr_diff?.length || 0) +
        (enrichments.local_changes?.length || 0) +
        (enrichments.edit?.length || 0) +
        (enrichments.commit?.length || 0),
    },
    {
      id: EnrichmentTab.COMMENTS,
      label: 'Comments',
      icon: <MessageSquare size={16} />,
      count: enrichments.comments?.length || 0,
    },
    {
      id: EnrichmentTab.DIFFS,
      label: 'Diffs',
      icon: <FileEdit size={16} />,
      count: enrichments.diff?.length || 0,
    },
    {
      id: EnrichmentTab.PRS,
      label: 'PRs',
      icon: <GitBranch size={16} />,
      count: enrichments.pr_diff?.length || 0,
    },
    {
      id: EnrichmentTab.LOCAL,
      label: 'Local',
      icon: <AlertCircle size={16} />,
      count: enrichments.local_changes?.length || 0,
    },
    {
      id: EnrichmentTab.CHANGES,
      label: 'Changes',
      icon: <Edit3 size={16} />,
      count:
        editChangesCount || (enrichments.edit?.length || 0) + (enrichments.commit?.length || 0),
    },
  ];

  const shouldShowTab = (tab: EnrichmentTab) => {
    if (tab === EnrichmentTab.ALL || tab === EnrichmentTab.COMMENTS) {
      return true; // Always show All and Comments tabs
    }
    // Always show Changes tab when there are pending changes or edit enrichments
    const editEnrichmentsCount =
      (enrichments.edit?.length || 0) + (enrichments.commit?.length || 0);
    if (tab === EnrichmentTab.CHANGES && (hasUnsavedChanges || editEnrichmentsCount > 0)) {
      return true;
    }
    const tabData = tabs.find(t => t.id === tab);
    return (tabData?.count || 0) > 0;
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Enrichments
        </h3>
        <button
          onClick={onClose}
          className="hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b overflow-x-auto"
        style={{
          borderColor: 'var(--border-color)',
        }}
      >
        {tabs
          .filter(tab => shouldShowTab(tab.id))
          .map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2"
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderColor: activeTab === tab.id ? '#0066cc' : 'transparent',
                backgroundColor: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="px-1.5 py-0.5 text-xs rounded"
                  style={{
                    backgroundColor: activeTab === tab.id ? '#0066cc' : 'var(--bg-tertiary)',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* All Tab - Raw Data */}
        {activeTab === EnrichmentTab.ALL && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Raw Enrichment Data (Debug)
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(enrichments, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre
                className="text-xs font-mono p-3 rounded overflow-auto"
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                }}
              >
                {JSON.stringify(enrichments, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === EnrichmentTab.COMMENTS && (
          <CommentsTab
            comments={enrichments.comments || []}
            fileName={fileName}
            sourceUri={sourceUri}
            selectedLines={selectedLines}
            onCommentsChange={onCommentsChange}
          />
        )}

        {/* Changes Tab */}
        {activeTab === EnrichmentTab.CHANGES && (
          <ChangesTab
            currentFilePath={filePath}
            spaceId={spaceId}
            onNavigateToFile={onNavigateToFile}
            editEnrichments={enrichments.edit}
            commitEnrichments={enrichments.commit}
            onRefresh={onCommentsChange}
            onLog={onLog}
          />
        )}

        {/* Other Tabs */}
        {(activeTab === EnrichmentTab.DIFFS ||
          activeTab === EnrichmentTab.PRS ||
          activeTab === EnrichmentTab.LOCAL) && (
          <div className="overflow-auto p-4">
            {/* Diffs */}
            {activeTab === EnrichmentTab.DIFFS &&
              enrichments.diff &&
              enrichments.diff.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Pending Changes ({enrichments.diff.length})
                  </h4>
                  {enrichments.diff.map(diff => (
                    <DiffViewer
                      key={diff.id}
                      diff={diff}
                      fileName={fileName}
                      onAccept={onAcceptDiff}
                      onReject={onRejectDiff}
                    />
                  ))}
                </div>
              )}

            {/* PRs */}
            {activeTab === EnrichmentTab.PRS &&
              enrichments.pr_diff &&
              enrichments.pr_diff.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4
                    className="font-medium text-sm mb-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Pull Requests ({enrichments.pr_diff.length})
                  </h4>
                  {enrichments.pr_diff.map(pr => (
                    <PRBanner
                      key={pr.pr_number}
                      prNumber={pr.pr_number}
                      prTitle={pr.pr_title}
                      prAuthor={pr.pr_author}
                      prState={pr.pr_state}
                      prUrl={pr.pr_url}
                      diffHunks={pr.diff_hunks}
                    />
                  ))}
                </div>
              )}

            {/* Empty state for PRs */}
            {activeTab === EnrichmentTab.PRS &&
              (!enrichments.pr_diff || enrichments.pr_diff.length === 0) && (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <GitBranch size={32} className="mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No pull request changes for this file</div>
                </div>
              )}

            {/* Diffs - keep existing code */}
            {activeTab === EnrichmentTab.DIFFS &&
              enrichments.diff &&
              enrichments.diff.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Pending Changes ({enrichments.diff.length})
                  </h4>
                  {enrichments.diff.map(diff => (
                    <DiffViewer
                      key={diff.id}
                      diff={diff}
                      fileName={fileName}
                      onAccept={onAcceptDiff}
                      onReject={onRejectDiff}
                    />
                  ))}
                </div>
              )}

            {/* Empty state for Diffs */}
            {activeTab === EnrichmentTab.DIFFS &&
              (!enrichments.diff || enrichments.diff.length === 0) && (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <FileEdit size={32} className="mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No pending changes for this file</div>
                </div>
              )}

            {/* Local Changes */}
            {activeTab === EnrichmentTab.LOCAL &&
              enrichments.local_changes &&
              enrichments.local_changes.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Local Changes ({enrichments.local_changes.length})
                  </h4>
                  {enrichments.local_changes.map(change => (
                    <div
                      key={change.id}
                      className="p-3 rounded border"
                      style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} style={{ color: '#ff9800' }} />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {change.commit_message || 'Local change'}
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span>{change.status}</span>
                        <span>{new Date(change.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Empty state for Local Changes */}
            {activeTab === EnrichmentTab.LOCAL &&
              (!enrichments.local_changes || enrichments.local_changes.length === 0) && (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No local changes for this file</div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
