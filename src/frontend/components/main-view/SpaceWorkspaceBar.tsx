import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
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
  Pencil,
  Loader2,
  CheckCircle2,
  Circle,
  FolderGit2,
} from 'lucide-react';
import type { Space } from '../../types';
import {
  getWorkspace,
  createTask,
  selectTask,
  deleteTask,
  createPullRequest,
  discardBranch,
  unstageBranch,
  rebaseBranch,
  renameTask,
  deletePr,
  type UserTaskInfo,
  type WorkspaceResponse,
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

// ── Task status badge ──────────────────────────────────────────────────────────

function TaskStatusBadge({ task }: { task: UserTaskInfo }) {
  if (task.conflict_files.length > 0) {
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ backgroundColor: '#fff3e0', color: '#e65100' }}
      >
        conflict
      </span>
    );
  }
  if (task.status === 'pr_open') {
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
      >
        PR #{task.pr_id}
      </span>
    );
  }
  if (task.files_count > 0) {
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ backgroundColor: '#e3f2fd', color: '#1565c0' }}
      >
        {task.files_count} file{task.files_count !== 1 ? 's' : ''}
      </span>
    );
  }
  if (task.draft_count > 0) {
    return (
      <span
        className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}
      >
        {task.draft_count} draft{task.draft_count !== 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      empty
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const SpaceWorkspaceBar = forwardRef<SpaceWorkspaceBarHandle, SpaceWorkspaceBarProps>(
  function SpaceWorkspaceBar({ space, onRefresh, onNavigateToFile }, ref) {
    const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
    const [draftFiles, setDraftFiles] = useState<DraftChangeListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showTaskDropdown, setShowTaskDropdown] = useState(false);
    const [showNewTaskForm, setShowNewTaskForm] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);
    const [isCommittedExpanded, setIsCommittedExpanded] = useState(false);
    const [isConflictsExpanded, setIsConflictsExpanded] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(false);
    const [prTitle, setPrTitle] = useState('');
    const [prDescription, setPrDescription] = useState('');
    const [showPrForm, setShowPrForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [isRenamingTask, setIsRenamingTask] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const stepClearTimer = useRef<ReturnType<typeof setTimeout>>();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const newTaskInputRef = useRef<HTMLInputElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

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
      if (stepClearTimer.current) {
        clearTimeout(stepClearTimer.current);
      }
      const clearDelay = level === 'info' ? 30000 : 5000;
      stepClearTimer.current = setTimeout(() => setCurrentStep(null), clearDelay);
    }, []);

    useImperativeHandle(ref, () => ({ addLog }), [addLog]);

    const loadWorkspace = useCallback(async () => {
      try {
        const [ws, drafts] = await Promise.all([
          getWorkspace(space.id),
          listDraftChanges(space.id),
        ]);
        setWorkspace(ws);
        setDraftFiles(drafts);
      } catch {
        // silent
      }
    }, [space.id]);

    useEffect(() => {
      if (!space.edit_enabled) {
        return;
      }
      loadWorkspace();
      const interval = setInterval(loadWorkspace, 30000);
      return () => clearInterval(interval);
    }, [space.edit_enabled, loadWorkspace]);

    useEffect(() => {
      if (isLogsExpanded && logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [logs, isLogsExpanded]);

    // Close dropdown on outside click
    useEffect(() => {
      if (!showTaskDropdown) {
        return;
      }
      const handler = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setShowTaskDropdown(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [showTaskDropdown]);

    // Focus new task input when form opens
    useEffect(() => {
      if (showNewTaskForm) {
        setTimeout(() => newTaskInputRef.current?.focus(), 50);
      }
    }, [showNewTaskForm]);

    // Focus rename input when rename mode is entered
    useEffect(() => {
      if (isRenamingTask) {
        setTimeout(() => renameInputRef.current?.focus(), 50);
      }
    }, [isRenamingTask]);

    if (!space.edit_enabled || !workspace) {
      return null;
    }

    const tasks = workspace.tasks;
    const selectedTask = tasks.find(t => t.id === workspace.selected_task_id) ?? null;

    // Derive status from selected task
    const hasConflicts = (selectedTask?.conflict_files?.length ?? 0) > 0;
    const hasBranch = !!selectedTask?.last_commit_sha;
    const isPrOpen = selectedTask?.status === 'pr_open';

    const askConfirm = (message: string, fn: () => void) => {
      setConfirm({ message, onConfirm: fn });
    };

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCreateTask = async () => {
      const name = newTaskName.trim();
      if (!name) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const task = await createTask(space.id, name);
        addLog(`Created task "${task.name}" → branch ${task.branch_name}`, 'success');
        setShowNewTaskForm(false);
        setNewTaskName('');
        await loadWorkspace();
        onRefresh?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create task';
        setError(msg);
        addLog(`Error: ${msg}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleSelectTask = async (taskId: string) => {
      setShowTaskDropdown(false);
      if (taskId === workspace?.selected_task_id) {
        return;
      }
      try {
        await selectTask(taskId);
        await loadWorkspace();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to select workspace';
        setError(msg);
      }
    };

    const handleDeleteWorkspace = (task: UserTaskInfo) => {
      setShowTaskDropdown(false);
      askConfirm(
        `Delete workspace "${task.name}"? All drafts associated with it will be removed.`,
        async () => {
          setIsLoading(true);
          setError(null);
          try {
            await deleteTask(task.id);
            addLog(`Deleted workspace "${task.name}"`, 'success');
            await loadWorkspace();
            onRefresh?.();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete workspace';
            setError(msg);
            addLog(`Error: ${msg}`, 'error');
          } finally {
            setIsLoading(false);
          }
        }
      );
    };

    const handleCreatePr = async () => {
      if (!selectedTask) {
        return;
      }
      setIsLoading(true);
      setError(null);
      addLog(`Creating pull request from ${selectedTask.branch_name}…`);
      try {
        const result = await createPullRequest(
          space.id,
          selectedTask.id,
          prTitle || selectedTask.name || undefined,
          prDescription || undefined
        );
        setShowPrForm(false);
        setPrTitle('');
        setPrDescription('');
        addLog(`PR created${result.pr_url ? ` → ${result.pr_url}` : ''}`, 'success');
        await loadWorkspace();
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
        `Discard all commits on workspace "${selectedTask?.name || selectedTask?.branch_name}"? This cannot be undone.`,
        async () => {
          setIsLoading(true);
          setError(null);
          addLog(`Resetting ${selectedTask?.branch_name} to base…`);
          try {
            await discardBranch(space.id, selectedTask?.id);
            addLog('Branch discarded', 'success');
            await loadWorkspace();
            onRefresh?.();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to discard';
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
        addLog(`Unstaging commits from ${selectedTask?.branch_name}…`);
        try {
          const result = await unstageBranch(space.id, selectedTask?.id);
          addLog(`Unstaged ${result.unstaged_files.length} file(s)`, 'success');
          await loadWorkspace();
          onRefresh?.();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to unstage';
          setError(msg);
          addLog(`Error: ${msg}`, 'error');
        } finally {
          setIsLoading(false);
        }
      });
    };

    const handleRenameTask = async () => {
      if (!selectedTask) {
        setIsRenamingTask(false);
        return;
      }
      const trimmed = renameValue.trim();
      if (!trimmed || trimmed === selectedTask.name) {
        setIsRenamingTask(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        await renameTask(selectedTask.id, trimmed);
        addLog(`Renamed task to "${trimmed}"`, 'success');
        setIsRenamingTask(false);
        await loadWorkspace();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to rename task';
        setError(msg);
        addLog(`Error: ${msg}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleDeletePr = () => {
      askConfirm(
        `Delete PR for workspace "${selectedTask?.name}"? The branch commits will be preserved.`,
        async () => {
          setIsLoading(true);
          setError(null);
          addLog(`Deleting PR for ${selectedTask?.branch_name}…`);
          try {
            await deletePr(space.id, selectedTask?.id);
            addLog('PR deleted', 'success');
            await loadWorkspace();
            onRefresh?.();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete PR';
            setError(msg);
            addLog(`Error: ${msg}`, 'error');
          } finally {
            setIsLoading(false);
          }
        }
      );
    };

    const handleRebase = async () => {
      setIsLoading(true);
      setError(null);
      addLog(`Rebasing ${selectedTask?.branch_name}…`);
      try {
        await rebaseBranch(space.id, selectedTask?.id);
        addLog('Rebase successful', 'success');
        await loadWorkspace();
        onRefresh?.();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Rebase failed';
        if (msg.includes('rebase_conflict')) {
          addLog('Rebase conflict — resolve and rebase again', 'error');
        } else {
          addLog(`Error: ${msg}`, 'error');
        }
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    // ── Styles ──────────────────────────────────────────────────────────────────

    const barColor = hasConflicts
      ? '#fff3e0'
      : isPrOpen
        ? '#e8f5e9'
        : hasBranch
          ? '#e3f2fd'
          : '#f9f9f9';
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

    // Drafts for the selected task
    const selectedTaskDrafts = selectedTask
      ? draftFiles.filter(d => d.branch_id === selectedTask.id)
      : draftFiles.filter(d => !d.branch_id);

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
          {/* ── Row 1: Task selector ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap">
            <FolderGit2 size={15} style={{ color: '#1976d2', flexShrink: 0 }} />

            {/* Task selector button */}
            <div className="relative" ref={dropdownRef}>
              {isRenamingTask && selectedTask ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleRenameTask();
                    }
                    if (e.key === 'Escape') {
                      setIsRenamingTask(false);
                    }
                  }}
                  onBlur={handleRenameTask}
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{
                    border: '1px solid #1976d2',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    width: 200,
                    outline: 'none',
                  }}
                />
              ) : (
                <button
                  onClick={() => {
                    setShowTaskDropdown(v => !v);
                    setShowNewTaskForm(false);
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(0,0,0,0.12)',
                  }}
                >
                  {selectedTask ? (
                    <>
                      <span className="truncate" style={{ maxWidth: 180 }}>
                        {selectedTask.name || selectedTask.branch_name}
                      </span>
                      <TaskStatusBadge task={selectedTask} />
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>Select workspace…</span>
                  )}
                  <ChevronDown size={12} />
                </button>
              )}

              {/* Dropdown */}
              {showTaskDropdown && (
                <div
                  className="absolute top-full left-0 mt-1 rounded border shadow-lg z-50"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-color)',
                    minWidth: 280,
                  }}
                >
                  {tasks.length > 0 && (
                    <div className="py-1">
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-1 px-2"
                          style={{
                            backgroundColor:
                              task.id === workspace.selected_task_id
                                ? 'rgba(25,118,210,0.08)'
                                : 'transparent',
                          }}
                        >
                          <button
                            onClick={() => handleSelectTask(task.id)}
                            className="flex-1 flex items-center gap-2 py-2 text-sm text-left hover:opacity-80"
                            style={{ color: 'var(--text-primary)', minWidth: 0 }}
                          >
                            {task.id === workspace.selected_task_id ? (
                              <CheckCircle2 size={14} style={{ color: '#1976d2', flexShrink: 0 }} />
                            ) : (
                              <Circle
                                size={14}
                                style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
                              />
                            )}
                            <span className="truncate flex-1">{task.name || task.branch_name}</span>
                            <TaskStatusBadge task={task} />
                          </button>
                          {task.name !== 'Default' && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteWorkspace(task);
                              }}
                              className="p-1 rounded hover:opacity-80 flex-shrink-0"
                              style={{ color: 'var(--text-secondary)' }}
                              title="Delete workspace"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    className="border-t px-3 py-2"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    {showNewTaskForm ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={newTaskInputRef}
                          type="text"
                          value={newTaskName}
                          onChange={e => setNewTaskName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleCreateTask();
                            }
                            if (e.key === 'Escape') {
                              setShowNewTaskForm(false);
                              setNewTaskName('');
                            }
                          }}
                          placeholder="Workspace name…"
                          className="flex-1 px-2 py-1 text-xs rounded border"
                          style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <button
                          onClick={handleCreateTask}
                          disabled={isLoading || !newTaskName.trim()}
                          className="px-2 py-1 text-xs rounded disabled:opacity-50"
                          style={{ backgroundColor: '#1976d2', color: 'white' }}
                        >
                          {isLoading ? <Loader2 size={11} className="animate-spin" /> : 'Create'}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewTaskForm(false);
                            setNewTaskName('');
                          }}
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewTaskForm(true)}
                        className="flex items-center gap-1.5 text-xs hover:opacity-80"
                        style={{ color: '#1976d2' }}
                      >
                        <Plus size={12} />
                        New workspace
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rename pencil icon for selected task */}
            {selectedTask && !isRenamingTask && (
              <button
                onClick={() => {
                  setRenameValue(selectedTask.name || selectedTask.branch_name);
                  setIsRenamingTask(true);
                  setShowTaskDropdown(false);
                }}
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
                title="Rename task"
              >
                <Pencil size={12} />
              </button>
            )}

            {/* Quick "new task" shortcut when no tasks exist */}
            {tasks.length === 0 && !showNewTaskForm && (
              <button
                onClick={() => {
                  setShowNewTaskForm(true);
                  setShowTaskDropdown(true);
                }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                style={{ backgroundColor: '#1976d2', color: 'white' }}
              >
                <Plus size={12} />
                New task
              </button>
            )}

            {/* Inline file/draft counters for selected task */}
            {selectedTask && (
              <>
                {hasBranch && selectedTask.files_count > 0 && (
                  <button
                    onClick={() => setIsCommittedExpanded(v => !v)}
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded hover:opacity-80"
                    style={{
                      backgroundColor: isCommittedExpanded
                        ? 'rgba(0,0,0,0.14)'
                        : 'rgba(0,0,0,0.08)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {selectedTask.files_count} file{selectedTask.files_count !== 1 ? 's' : ''}
                    {isCommittedExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}
                {selectedTask.draft_count > 0 && (
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
                    + {selectedTask.draft_count} draft{selectedTask.draft_count !== 1 ? 's' : ''}
                    {isDraftsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </>
            )}

            {/* Inline spinner */}
            {(isLoading || currentStep) && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {isLoading && <Loader2 size={12} className="animate-spin" />}
                {currentStep}
              </span>
            )}

            <div className="flex-1" />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {selectedTask?.pr_url && (
                <a
                  href={selectedTask.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: '#4caf50', color: 'white' }}
                >
                  <ExternalLink size={12} />
                  View PR
                </a>
              )}

              {hasBranch &&
                !hasConflicts &&
                (isPrOpen ? (
                  <button
                    onClick={handleDeletePr}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    <GitPullRequest size={12} />
                    Delete PR
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPrForm(v => !v)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: '#1976d2', color: 'white' }}
                  >
                    <GitPullRequest size={12} />
                    Create PR
                  </button>
                ))}

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
                  style={{ color: '#e65100' }}
                >
                  <AlertTriangle size={12} />
                  {selectedTask!.conflict_files.length} conflict
                  {selectedTask!.conflict_files.length !== 1 ? 's' : ''}
                  {isConflictsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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

          {/* ── Error ──────────────────────────────────────────────────────────── */}
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

          {/* ── Draft files for selected task ──────────────────────────────────── */}
          {isDraftsExpanded && selectedTaskDrafts.length > 0 && (
            <div
              className="mt-2 rounded border overflow-hidden"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {selectedTaskDrafts.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => onNavigateToFile?.(draft.file_path)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:opacity-80 border-b last:border-b-0"
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
                      style={{ color: 'var(--text-secondary)', maxWidth: 200 }}
                    >
                      {draft.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Committed files for selected task ─────────────────────────────── */}
          {isCommittedExpanded && selectedTask && (selectedTask.files || []).length > 0 && (
            <div
              className="mt-2 rounded border overflow-hidden"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div
                className="flex items-center gap-2 px-3 py-1.5 border-b"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <span
                  className="text-xs font-mono flex-1 truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {selectedTask.branch_name}
                </span>
                {isPrOpen ? (
                  <button
                    disabled={isLoading}
                    onClick={handleDeletePr}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626', color: 'white' }}
                  >
                    <GitPullRequest size={11} />
                    Delete PR
                  </button>
                ) : (
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
                >
                  <RotateCcw size={11} />
                  Unstage
                </button>
              </div>
              {(selectedTask.files || []).map(filePath => (
                <div
                  key={filePath}
                  className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0"
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

          {/* ── Conflicts ──────────────────────────────────────────────────────── */}
          {isConflictsExpanded && selectedTask && selectedTask.conflict_files.length > 0 && (
            <div className="mt-2 text-xs space-y-1">
              <div className="font-medium" style={{ color: '#e65100' }}>
                Files with conflicts — resolve and rebase:
              </div>
              {selectedTask.conflict_files.map(f => (
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

          {/* ── Operation log ──────────────────────────────────────────────────── */}
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
                style={{ backgroundColor: '#1e1e1e', maxHeight: 120, padding: '4px 8px' }}
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

          {/* ── PR creation form ───────────────────────────────────────────────── */}
          {showPrForm && (
            <div
              className="mt-3 p-3 rounded border space-y-2"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
            >
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Create Pull Request {selectedTask?.name ? `— ${selectedTask.name}` : ''}
              </div>
              <input
                type="text"
                value={prTitle}
                onChange={e => setPrTitle(e.target.value)}
                placeholder={
                  selectedTask?.name ? `${selectedTask.name} (auto)` : 'Title (optional)'
                }
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
