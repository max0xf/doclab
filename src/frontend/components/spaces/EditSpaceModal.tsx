import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import spaceApi from '../../services/spaceApi';
import type { Space } from '../../types';
import { SpaceVisibility } from '../../types';

interface EditSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  space: Space;
}

export default function EditSpaceModal({ isOpen, onClose, onSuccess, space }: EditSpaceModalProps) {
  // Reconstruct Git URL from stored fields if available
  const getCurrentGitUrl = (s: Space) => {
    if (!s.git_base_url || !s.git_repository_id) {
      return '';
    }

    if (s.git_provider === 'bitbucket_server' && s.git_project_key) {
      return `${s.git_base_url}/projects/${s.git_project_key}/repos/${s.git_repository_id}/`;
    } else if (s.git_provider === 'github') {
      return `${s.git_base_url}/${s.git_repository_id}`;
    } else {
      return `${s.git_base_url}/${s.git_repository_id}`;
    }
  };

  const [formData, setFormData] = useState({
    name: space.name,
    description: space.description || '',
    visibility: space.visibility,
    git_provider: space.git_provider || 'bitbucket_server',
    git_repository_url: getCurrentGitUrl(space),
    git_default_branch: space.git_default_branch || '',
    // Edit fork configuration
    edit_fork_project_key: space.edit_fork_project_key || '',
    edit_fork_repo_slug: space.edit_fork_repo_slug || '',
    edit_fork_ssh_url: space.edit_fork_ssh_url || '',
    edit_fork_local_path: space.edit_fork_local_path || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when space changes
  useEffect(() => {
    setFormData({
      name: space.name,
      description: space.description || '',
      visibility: space.visibility,
      git_provider: space.git_provider || 'bitbucket_server',
      git_repository_url: getCurrentGitUrl(space),
      git_default_branch: space.git_default_branch || '',
      edit_fork_project_key: space.edit_fork_project_key || '',
      edit_fork_repo_slug: space.edit_fork_repo_slug || '',
      edit_fork_ssh_url: space.edit_fork_ssh_url || '',
      edit_fork_local_path: space.edit_fork_local_path || '',
    });
    setError(null);
  }, [space]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await spaceApi.updateSpace(space.slug, {
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility as SpaceVisibility,
        git_provider: formData.git_provider,
        git_repository_url: formData.git_repository_url || undefined,
        git_default_branch: formData.git_default_branch,
        // Edit fork configuration
        edit_fork_project_key: formData.edit_fork_project_key || undefined,
        edit_fork_repo_slug: formData.edit_fork_repo_slug || undefined,
        edit_fork_ssh_url: formData.edit_fork_ssh_url || undefined,
        edit_fork_local_path: formData.edit_fork_local_path || undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update space');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--card-bg)',
          }}
        >
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Edit Space
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
              }}
            >
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Basic Information
            </h3>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Space Key (Slug)
              </label>
              <input
                type="text"
                value={space.slug}
                disabled
                className="w-full px-3 py-2 rounded-lg border opacity-60 cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-muted)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Slug cannot be changed
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Space Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border resize-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Technical documentation for the engineering team"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Visibility *
              </label>
              <select
                value={formData.visibility}
                onChange={e =>
                  setFormData({ ...formData, visibility: e.target.value as SpaceVisibility })
                }
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="private">Private - Only you and invited users</option>
                <option value="team">Team - All authenticated users</option>
                <option value="public">Public - Anyone with the link</option>
              </select>
            </div>
          </div>

          {/* Git Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Git Repository
            </h3>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Git Provider *
              </label>
              <select
                value={formData.git_provider}
                onChange={e => setFormData({ ...formData, git_provider: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="bitbucket_server">Bitbucket Server</option>
                <option value="github">GitHub</option>
                <option value="local_git">Local Git</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Repository URL
              </label>
              <input
                type="text"
                value={formData.git_repository_url}
                onChange={e => setFormData({ ...formData, git_repository_url: e.target.value })}
                placeholder="https://git.acronis.work/projects/AIT/repos/git-stats/"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Default Branch
              </label>
              <input
                type="text"
                value={formData.git_default_branch}
                onChange={e => setFormData({ ...formData, git_default_branch: e.target.value })}
                placeholder="Leave empty to use repository default"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Leave empty to use the repository's default branch
              </p>
            </div>
          </div>

          {/* Edit Fork Configuration */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Edit Workflow (Optional)
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Configure a fork repository to enable in-browser editing and PR creation
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Fork Project Key
              </label>
              <input
                type="text"
                value={formData.edit_fork_project_key}
                onChange={e => setFormData({ ...formData, edit_fork_project_key: e.target.value })}
                placeholder="e.g., ~username or PROJECT"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Project key where the fork lives (use ~username for personal forks)
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Fork Repository Slug
              </label>
              <input
                type="text"
                value={formData.edit_fork_repo_slug}
                onChange={e => setFormData({ ...formData, edit_fork_repo_slug: e.target.value })}
                placeholder="e.g., cyber-repo"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Fork SSH URL
              </label>
              <input
                type="text"
                value={formData.edit_fork_ssh_url}
                onChange={e => setFormData({ ...formData, edit_fork_ssh_url: e.target.value })}
                placeholder="ssh://git@git.example.com/~username/repo.git"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                SSH clone URL for the fork (DocLab server needs SSH access)
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Local Fork Path (Development)
              </label>
              <input
                type="text"
                value={formData.edit_fork_local_path}
                onChange={e => setFormData({ ...formData, edit_fork_local_path: e.target.value })}
                placeholder="/path/to/local/fork/repo"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Local path to pre-cloned fork repo (for development, overrides SSH URL)
              </p>
            </div>

            {/* Status indicator */}
            {formData.edit_fork_local_path ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--success-bg, #dcfce7)',
                  color: 'var(--success, #16a34a)',
                }}
              >
                <span>✓</span>
                <span>Edit workflow enabled (using local repo)</span>
              </div>
            ) : formData.edit_fork_project_key &&
              formData.edit_fork_repo_slug &&
              formData.edit_fork_ssh_url ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--success-bg, #dcfce7)',
                  color: 'var(--success, #16a34a)',
                }}
              >
                <span>✓</span>
                <span>Edit workflow will be enabled for this space</span>
              </div>
            ) : formData.edit_fork_project_key ||
              formData.edit_fork_repo_slug ||
              formData.edit_fork_ssh_url ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--warning-bg, #fef3c7)',
                  color: 'var(--warning, #d97706)',
                }}
              >
                <span>⚠</span>
                <span>Fill all three fields to enable edit workflow</span>
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Updating...' : 'Update Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
