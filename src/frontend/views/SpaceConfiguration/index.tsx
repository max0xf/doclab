import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Search, Star, FolderTree } from 'lucide-react';
import spaceApi from '../../services/spaceApi';
import CreateSpaceModal from '../../components/CreateSpaceModal';
import EditSpaceModal from '../../components/EditSpaceModal';
import FileMappingConfiguration from '../../components/FileMappingConfiguration';
import type { Space, UserSpacePreference } from '../../types';

export default function SpaceConfiguration() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [favorites, setFavorites] = useState<UserSpacePreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [configuringMappingSpace, setConfiguringMappingSpace] = useState<Space | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const { all, favorites: favs } = await spaceApi.getMySpaces();
      setSpaces(all);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpaceCreated = async () => {
    await loadSpaces();
  };

  const handleToggleFavorite = async (space: Space) => {
    const isFavorite = favorites.some(f => f.space_slug === space.slug);
    try {
      if (isFavorite) {
        await spaceApi.removeFromFavorites(space.slug);
      } else {
        await spaceApi.addToFavorites(space.slug);
      }
      await loadSpaces();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDeleteSpace = async (slug: string) => {
    if (
      !window.confirm('Are you sure you want to delete this space? This action cannot be undone.')
    ) {
      return;
    }

    try {
      await spaceApi.deleteSpace(slug);
      await loadSpaces();
    } catch (error) {
      console.error('Failed to delete space:', error);
      alert('Failed to delete space');
    }
  };

  const filteredSpaces = spaces.filter(
    space =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'Private';
      case 'team':
        return 'Team';
      case 'public':
        return 'Public';
      default:
        return visibility;
    }
  };

  const getProviderLabel = (provider: string | null) => {
    if (!provider) {
      return 'Not configured';
    }
    switch (provider) {
      case 'github':
        return 'GitHub';
      case 'bitbucket_server':
        return 'Bitbucket Server';
      case 'local_git':
        return 'Local Git';
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg" style={{ color: 'var(--text-muted)' }}>
          Loading spaces...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Space Configuration
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Manage all spaces and their Git repository connections
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
            }}
          >
            <Plus size={20} />
            Create Space
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filteredSpaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'No spaces found matching your search' : 'No spaces configured yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                }}
              >
                <Plus size={16} className="inline mr-2" />
                Create Your First Space
              </button>
            )}
          </div>
        ) : (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Space
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Slug
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Visibility
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Git Provider
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Repository
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Branch
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSpaces.map((space, index) => (
                  <tr
                    key={space.id}
                    className="border-t"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor:
                        index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {space.name}
                        </div>
                        {space.description && (
                          <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {space.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code
                        className="text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--code-bg)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {space.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {getVisibilityLabel(space.visibility)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {getProviderLabel(space.git_provider)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {space.git_repository_name || space.git_repository_id || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {space.git_default_branch || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleFavorite(space)}
                          className="p-2 rounded-lg transition-all"
                          style={{
                            color: favorites.some(f => f.space_slug === space.slug)
                              ? 'var(--warning)'
                              : 'var(--text-muted)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title={
                            favorites.some(f => f.space_slug === space.slug)
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                        >
                          <Star
                            size={16}
                            fill={
                              favorites.some(f => f.space_slug === space.slug)
                                ? 'currentColor'
                                : 'none'
                            }
                          />
                        </button>
                        <button
                          onClick={() => setConfiguringMappingSpace(space)}
                          className="p-2 rounded-lg transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--primary)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title="Configure file mappings"
                        >
                          <FolderTree size={16} />
                        </button>
                        <button
                          onClick={() => setEditingSpace(space)}
                          className="p-2 rounded-lg transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--primary)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title="Edit space"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSpace(space.slug)}
                          className="p-2 rounded-lg transition-all"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--danger)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                          }}
                          title="Delete space"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSpaceCreated}
      />

      {/* Edit Space Modal */}
      {editingSpace && (
        <EditSpaceModal
          isOpen={true}
          onClose={() => setEditingSpace(null)}
          onSuccess={handleSpaceCreated}
          space={editingSpace}
        />
      )}

      {/* File Mapping Configuration Modal */}
      {configuringMappingSpace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <FileMappingConfiguration
              space={configuringMappingSpace}
              onClose={() => setConfiguringMappingSpace(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
