import React, { useState } from 'react';
import { X } from 'lucide-react';
import spaceApi from '../services/spaceApi';
import { SpaceVisibility } from '../types';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSpaceModal({ isOpen, onClose, onSuccess }: CreateSpaceModalProps) {
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    visibility: SpaceVisibility.Team,
    git_provider: 'bitbucket_server',
    git_repository_url: '',
    git_default_branch: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await spaceApi.createSpace({
        slug: formData.slug,
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        git_provider: formData.git_provider,
        git_repository_url: formData.git_repository_url,
        git_default_branch: formData.git_default_branch,
      });

      // Reset form
      setFormData({
        slug: '',
        name: '',
        description: '',
        visibility: SpaceVisibility.Team,
        git_provider: 'bitbucket_server',
        git_repository_url: '',
        git_default_branch: '',
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl"
        style={{ backgroundColor: 'var(--card-bg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Create New Space
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-opacity-10 hover:bg-gray-500 transition-all"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--error-bg, #fee)',
                borderColor: 'var(--error-border, #fcc)',
                color: 'var(--error-text, #c00)',
              }}
            >
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Basic Information
            </h3>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Space Key (Slug) *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={e =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                placeholder="engineering-wiki"
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Lowercase letters, numbers, and hyphens only
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
                placeholder="Engineering Wiki"
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
                placeholder="Technical documentation for the engineering team"
                rows={3}
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
              {loading ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
