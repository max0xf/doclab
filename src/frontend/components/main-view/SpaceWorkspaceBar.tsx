import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Trash2,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileText,
  Plus,
  Minus,
  Edit3,
  Loader2,
} from 'lucide-react';
import type { Space } from '../../types';
import {
  getBranchStatus,
  createPullRequest,
  discardBranch,
  unstageBranch,
  rebaseBranch,
  type UserBranchInfo,
} from '../../services/userBranchApi';
import { listDraftChanges, type DraftChangeListItem } from '../../services/draftChangeApi';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface LogEntry {
  time: string;
  message: string;
  level: 'info' | 'error' | 'success';
}

export interface SpaceWorkspaceBarHandle {
  addLog: (message: string, level?: LogEntry['level']) => void;
}

interface SpaceWorkspaceBarProps {
  space: Space;
  onRefresh?: () => void;
  onNavigateToFile?: (filePath: string) => void;
}

export const SpaceWorkspaceBar = forwardRef<SpaceWorkspaceBarHandle, SpaceWorkspaceBarProps>(
  function SpaceWorkspaceBar({ space, onRefresh, onNavigateToFile }, ref) {
    const [draftCount, setDraftCount] = useState(0);
    const [draftFiles, setDraftFiles] = useState<DraftChangeListItem[]>([]);
    const [branch, setBranch] = useState<UserBranchInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);
    const [isCommittedExpanded, setIsCommittedExpanded] = useState(false);
    const [isConflictsExpanded, setIsConflictsExpanded] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(false);
    const [prTitle, setPrTitle] = useState('');
    const [prDescription, setPrDescription] = useState('');
    const [showPrForm, setShowPrForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conflictFiles, setConflictFiles] = useState<string[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const stepClearTimer = useRef<ReturnType<typeof setTimeout>>();

    const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLogs(prev => [...prev, { time, message, level }]);
      setCurrentStep(message);
      // Auto-clear step label 5s after the last log entry
      if (stepClearTimer.current) {
        clearTimeout(stepClearTimer.current);
      }
      stepClearTimer.current = setTimeout(() => setCurrentStep(null), 5000);
    }, []);

    useImperativeHandle(ref, () => ({ addLog }), [addLog]);

    const loadStatus = useCallback(async () => {
      try {
        const [statusRes, drafts] = await Promise.all([
          getBranchStatus(space.id),
          listDraftChanges(space.id),
        ]);
        setDraftCount(statusRes.draft_count);
        setDraftFiles(drafts);
        setBranch(statusRes.branch);
        if (statusRes.branch?.conflict_files?.length) {
          setConflictFiles(statusRes.branch.conflict_files);
        } else {
          setConflictFiles([]);
        }
      } catch {
        // silent — bar will just stay hidden or stale
      }
    }, [space.id]);

    useEffect(() => {
      if (!space.edit_enabled) {
        return;
      }
      loadStatus();
      const interval = setInterval(loadStatus, 30000);
      return () => clearInterval(interval);
    }, [space.edit_enabled, loadStatus]);

    useEffect(() => {
      if (isLogsExpanded && logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [logs, isLogsExpanded]);

    if (!space.edit_enabled) {
      return null;
    }

    if (draftCount === 0 && !branch) {
      return null;
    }

    const hasConflicts = conflictFiles.length > 0;
    const hasBranch = !!branch;
    const isPrOpen = branch?.status === 'pr_open';

    const askConfirm = (message: string, fn: () => void) => {
      setConfirm({ message, onConfirm: fn });
    };

    const handleCreatePr = async () => {
      if (!branch) {
        return;
      }
      setIsLoading(true);
      setError(null);
      addLog(`Creating pull request from branch ${branch.branch_name}…`);
      try {
        const result = await createPullRequest(
          space.id,
          prTitle || undefined,
          prDescription || undefined
        );
        setShowPrForm(false);
        setPrTitle('');
        setPrDescription('');
        addLog(`PR created successfully${result.pr_url ? ` → ${result.pr_url}` : ''}`, 'success');
        await loadStatus();
        onRefresh?.();
        if (result.pr_url) {
          window.open(result.pr_url, '_blank', 'noopener,noreferrer');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create PR';
        setError(msg);
        addLog(`Error: ${msg}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleDiscard = () => {
      askConfirm(
        `Discard all commits on branch "${branch?.branch_name}"? This cannot be undone.`,
        async () => {
          setIsLoading(true);
          setError(null);
          addLog(`Resetting branch ${branch?.branch_name} to base (${branch?.base_branch})…`);
          try {
            addLog('Running git reset --hard and force-pushing…');
            await discardBranch(space.id);
            addLog('Branch discarded — all commits removed', 'success');
            await loadStatus();
            onRefresh?.();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to discard branch';
            setError(msg);
            addLog(`Error: ${msg}`, 'error');
          } finally {
            setIsLoading(false);
          }
        }
      );
    };

    const handleUnstage = () => {
      askConfirm('Move all commits back to draft edits? The branch will be reset.', async () => {
        setIsLoading(true);
        setError(null);
        addLog(`Unstaging commits from ${branch?.branch_name}…`);
        try {
          addLog('Running soft reset and converting commits to draft edits…');
          const result = await unstageBranch(space.id);
          addLog(
            `Unstaged ${result.unstaged_files.length} file(s) → now appear as draft edits`,
            'success'
          );
          await loadStatus();
          onRefresh?.();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to unstage branch';
          setError(msg);
          addLog(`Error: ${msg}`, 'error');
        } finally {
          setIsLoading(false);
        }
      });
    };

    const handleRebase = async () => {
      setIsLoading(true);
      setError(null);
      addLog(`Rebasing ${branch?.branch_name} onto origin/${branch?.base_branch}…`);
      try {
        await rebaseBranch(space.id);
        setConflictFiles([]);
        addLog('Rebase successful — branch is up to date', 'success');
        await loadStatus();
        onRefresh?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Rebase failed';
        if (msg.includes('rebase_conflict')) {
          addLog('Rebase conflict detected — resolve conflicts and rebase again', 'error');
        } else {
          addLog(`Error: ${msg}`, 'error');
        }
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    const barColor = hasConflicts
      ? '#fff3e0'
      : isPrOpen
        ? '#e8f5e9'
        : hasBranch
          ? '#e3f2fd'
          : '#f5f5f5';

    const borderColor = hasConflicts
      ? '#ff9800'
      : isPrOpen
        ? '#4caf50'
        : hasBranch
          ? '#1976d2'
          : '#e0e0e0';

    const changeTypeIcon = (type: string) => {
      if (type === 'create') {
        return <Plus size={11} style={{ color: '#16a34a' }} />;
      }
      if (type === 'delete') {
        return <Minus size={11} style={{ color: '#dc2626' }} />;
      }
      return <Edit3 size={11} style={{ color: '#2563eb' }} />;
    };

    return (
      <>
        {confirm && (
          <ConfirmDialog
            message={confirm.message}
            onConfirm={() => {
              const fn = confirm.onConfirm;
              setConfirm(null);
              fn();
            }}
            onCancel={() => setConfirm(null)}
          />
        )}

        <div
          style={{
            backgroundColor: barColor,
            borderBottom: `2px solid ${borderColor}`,
            padding: '8px 16px',
          }}
        >
          {/* Main bar row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status icon + label */}
            <div className="flex items-center gap-2">
              {hasConflicts ? (
                <AlertTriangle size={16} style={{ color: '#e65100' }} />
              ) : (
                <GitBranch size={16} style={{ color: '#1976d2' }} />
              )}

              {/* Draft count — clickable to expand list */}
              {!hasBranch && draftCount > 0 ? (
                <button
                  onClick={() => setIsDraftsExpanded(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium hover:underline"
                  style={{
                    color: 'var(--text-primary)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {draftCount} draft change{draftCount !== 1 ? 's' : ''}
                  {isDraftsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : (
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {hasConflicts
                    ? 'Merge conflict'
                    : isPrOpen
                      ? 'PR open'
                      : `Branch: ${branch!.branch_name}`}
                </span>
              )}

              {hasBranch && branch!.files_count > 0 && (
                <button
                  onClick={() => setIsCommittedExpanded(v => !v)}
                  className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:opacity-80"
                  style={{
                    backgroundColor: isCommittedExpanded ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.08)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {branch!.files_count} file{branch!.files_count !== 1 ? 's' : ''}
                  {isCommittedExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}

              {draftCount > 0 && hasBranch && (
                <button
                  onClick={() => setIsDraftsExpanded(v => !v)}
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  + {draftCount} draft{draftCount !== 1 ? 's' : ''}
                  {isDraftsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}

              {/* Inline progress indicator — spinner always shown while loading */}
              {(isLoading || currentStep) && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isLoading && <Loader2 size={12} className="animate-spin" />}
                  {currentStep}
                </span>
              )}
            </div>

            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {isPrOpen && branch?.pr_url && (
                <a
                  href={branch.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#4caf50', color: 'white' }}
                >
                  <ExternalLink size={12} />
                  View PR
                </a>
              )}

              {hasBranch && !isPrOpen && !hasConflicts && (
                <button
                  onClick={() => setShowPrForm(v => !v)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                  style={{ backgroundColor: '#1976d2', color: 'white' }}
                >
                  <GitPullRequest size={12} />
                  Create PR
                </button>
              )}

              {hasBranch && (
                <button
                  onClick={handleRebase}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                  style={{
                    backgroundColor: hasConflicts ? '#e65100' : 'var(--bg-secondary)',
                    color: hasConflicts ? 'white' : 'var(--text-secondary)',
                  }}
                  title="Rebase branch onto latest base"
                >
                  <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                  Rebase
                </button>
              )}

              {hasBranch && (
                <button
                  onClick={handleUnstage}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  title="Move commits back to draft edits"
                >
                  <RotateCcw size={12} />
                  Unstage
                </button>
              )}

              {hasBranch && (
                <button
                  onClick={handleDiscard}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: '#dc2626' }}
                  title="Discard all commits (hard reset)"
                >
                  <Trash2 size={12} />
                  Discard
                </button>
              )}

              {hasConflicts && (
                <button
                  onClick={() => setIsConflictsExpanded(v => !v)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isConflictsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {conflictFiles.length} conflict{conflictFiles.length !== 1 ? 's' : ''}
                </button>
              )}

              {logs.length > 0 && (
                <button
                  onClick={() => setIsLogsExpanded(v => !v)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{
                    color: 'var(--text-secondary)',
                    backgroundColor: isLogsExpanded ? 'rgba(0,0,0,0.06)' : 'transparent',
                  }}
                  title="Toggle operation log"
                >
                  <Terminal size={12} />
                  Log
                </button>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-2 text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
            >
              {error}
              <button className="ml-2 underline" onClick={() => setError(null)}>
                dismiss
              </button>
            </div>
          )}

          {/* Draft files list */}
          {isDraftsExpanded && draftFiles.length > 0 && (
            <div
              className="mt-2 rounded border overflow-hidden"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {draftFiles.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => onNavigateToFile?.(draft.file_path)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:opacity-80 transition-opacity border-b last:border-b-0"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: onNavigateToFile ? 'pointer' : 'default',
                  }}
                >
                  {changeTypeIcon(draft.change_type)}
                  <FileText size={11} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span className="font-mono truncate flex-1">{draft.file_path}</span>
                  {draft.description && (
                    <span
                      className="truncate"
                      style={{ color: 'var(--text-secondary)', maxWidth: '200px' }}
                    >
                      {draft.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Committed files list */}
          {isCommittedExpanded && branch && (branch.files || []).length > 0 && (
            <div
              className="mt-2 rounded border overflow-hidden"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {/* Header row with branch-level actions */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 border-b"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>
                  {branch.branch_name}
                </span>
                {!isPrOpen && (
                  <button
                    disabled={isLoading}
                    onClick={() => setShowPrForm(v => !v)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: '#1976d2', color: 'white' }}
                  >
                    <GitPullRequest size={11} />
                    Create PR
                  </button>
                )}
                <button
                  disabled={isLoading}
                  onClick={handleUnstage}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                  title="Move all commits back to draft edits"
                >
                  <RotateCcw size={11} />
                  Unstage
                </button>
              </div>

              {/* File rows */}
              {(branch.files || []).map(filePath => (
                <div
                  key={filePath}
                  className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 group"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <GitCommit size={11} style={{ color: '#7c3aed', flexShrink: 0 }} />
                  <button
                    onClick={() => onNavigateToFile?.(filePath)}
                    className="font-mono truncate flex-1 text-xs text-left hover:underline"
                    style={{
                      color: 'var(--text-primary)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: onNavigateToFile ? 'pointer' : 'default',
                    }}
                  >
                    {filePath}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Conflict file list */}
          {isConflictsExpanded && conflictFiles.length > 0 && (
            <div className="mt-2 text-xs space-y-1">
              <div className="font-medium" style={{ color: '#e65100' }}>
                Files with conflicts — resolve and rebase:
              </div>
              {conflictFiles.map(f => (
                <div
                  key={f}
                  className="flex items-center gap-1 font-mono"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <AlertTriangle size={10} style={{ color: '#e65100' }} />
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* Operation log panel — collapsed by default, expanded via Log button */}
          {isLogsExpanded && logs.length > 0 && (
            <div
              className="mt-2 rounded border overflow-hidden"
              style={{ borderColor: 'rgba(0,0,0,0.12)' }}
            >
              <div
                className="flex items-center justify-between px-2 py-1"
                style={{ backgroundColor: '#1e1e1e', color: '#cccccc' }}
              >
                <span className="text-xs font-medium flex items-center gap-1">
                  <Terminal size={11} />
                  Operation log
                </span>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs opacity-60 hover:opacity-100"
                  style={{ color: '#cccccc' }}
                >
                  clear
                </button>
              </div>
              <div
                className="font-mono text-xs overflow-y-auto"
                style={{ backgroundColor: '#1e1e1e', maxHeight: '120px', padding: '4px 8px' }}
              >
                {logs.map((entry, i) => (
                  <div key={i} className="flex gap-2 leading-5">
                    <span style={{ color: '#6a9955', flexShrink: 0 }}>{entry.time}</span>
                    <span
                      style={{
                        color:
                          entry.level === 'error'
                            ? '#f48771'
                            : entry.level === 'success'
                              ? '#4ec9b0'
                              : '#cccccc',
                      }}
                    >
                      {entry.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* PR creation form */}
          {showPrForm && (
            <div
              className="mt-3 p-3 rounded border space-y-2"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Create Pull Request
              </div>
              <input
                type="text"
                value={prTitle}
                onChange={e => setPrTitle(e.target.value)}
                placeholder="Title (optional — auto-generated if blank)"
                className="w-full px-2 py-1 text-xs rounded border"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              <textarea
                value={prDescription}
                onChange={e => setPrDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full px-2 py-1 text-xs rounded border resize-none"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreatePr}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded disabled:opacity-50"
                  style={{ backgroundColor: '#1976d2', color: 'white' }}
                >
                  <GitPullRequest size={12} />
                  {isLoading ? 'Creating…' : 'Create PR'}
                </button>
                <button
                  onClick={() => setShowPrForm(false)}
                  className="px-2 py-1.5 text-xs rounded"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
);
