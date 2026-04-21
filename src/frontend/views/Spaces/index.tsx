import React, { useState, useEffect } from 'react';
import { Search, Plus, Star, Grid, List } from 'lucide-react';
import type { Space, UserSpacePreference } from '../../types';
import spaceApi from '../../services/spaceApi';
import { Urls } from '../../types';
import CreateSpaceModal from '../../components/common/CreateSpaceModal';

interface SpacesProps {
  navigate: (view: string) => void;
}

export default function Spaces({ navigate }: SpacesProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [favorites, setFavorites] = useState<UserSpacePreference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const { favorites: favs, all } = await spaceApi.getMySpaces();
        console.log('Loaded favorites:', favs);
        console.log('Loaded spaces:', all);
        setSpaces(all);
        setFavorites(favs);
      } catch (error) {
        console.error('Failed to load spaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpaces();
  }, []);

  const handleNavigateToSpace = (spaceSlug: string) => {
    navigate(`${Urls.Spaces}?space=${spaceSlug}`);
  };

  const handleToggleFavorite = async (spaceSlug: string) => {
    const isFavorite = favorites.some(f => f.space_slug === spaceSlug);
    console.log('Toggle favorite for:', spaceSlug, 'Currently favorite:', isFavorite);
    console.log('Current favorites:', favorites);
    try {
      if (isFavorite) {
        await spaceApi.removeFromFavorites(spaceSlug);
        const newFavorites = favorites.filter(f => f.space_slug !== spaceSlug);
        setFavorites(newFavorites);
        console.log('Removed from favorites, new favorites:', newFavorites);
      } else {
        const newPref = await spaceApi.addToFavorites(spaceSlug);
        const newFavorites = [...favorites, newPref];
        setFavorites(newFavorites);
        console.log('Added to favorites:', newPref);
        console.log('New favorites array:', newFavorites);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSpaceCreated = async () => {
    // Reload spaces after creation
    try {
      const { favorites: favs, all } = await spaceApi.getMySpaces();
      setSpaces(all);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to reload spaces:', error);
    }
  };

  const filteredSpaces = spaces.filter(
    space =>
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteSpaces = filteredSpaces.filter(space =>
    favorites.some(f => f.space_slug === space.slug)
  );
  const otherSpaces = filteredSpaces.filter(
    space => !favorites.some(f => f.space_slug === space.slug)
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Loading spaces...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b px-6 py-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Spaces
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Browse and manage your documentation spaces
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Plus size={20} />
            Create Space
          </button>
        </div>

        {/* Search and View Mode */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
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

          {/* View Mode Toggle */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded transition-all"
              style={{
                backgroundColor: viewMode === 'grid' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Grid view"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded transition-all"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--card-bg)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="List view"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Favorites */}
        {favoriteSpaces.length > 0 && (
          <section className="mb-8">
            <h2
              className="text-xl font-semibold mb-4 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Star size={20} className="text-yellow-500" />
              Favorites ({favoriteSpaces.length})
            </h2>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteSpaces.map(space => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isFavorite={true}
                    onNavigate={() => handleNavigateToSpace(space.slug)}
                    onToggleFavorite={() => handleToggleFavorite(space.slug)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteSpaces.map(space => (
                  <SpaceListItem
                    key={space.id}
                    space={space}
                    isFavorite={true}
                    onNavigate={() => handleNavigateToSpace(space.slug)}
                    onToggleFavorite={() => handleToggleFavorite(space.slug)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* All Spaces */}
        {otherSpaces.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              All Spaces ({otherSpaces.length})
            </h2>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherSpaces.map(space => (
                  <SpaceCard
                    key={space.id}
                    space={space}
                    isFavorite={favorites.some(f => f.space_slug === space.slug)}
                    onNavigate={() => handleNavigateToSpace(space.slug)}
                    onToggleFavorite={() => handleToggleFavorite(space.slug)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {otherSpaces.map(space => (
                  <SpaceListItem
                    key={space.id}
                    space={space}
                    isFavorite={favorites.some(f => f.space_slug === space.slug)}
                    onNavigate={() => handleNavigateToSpace(space.slug)}
                    onToggleFavorite={() => handleToggleFavorite(space.slug)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {filteredSpaces.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Search size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {searchQuery ? 'No spaces found' : 'No spaces yet'}
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first space to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                }}
              >
                Create Space
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSpaceCreated}
      />
    </div>
  );
}

interface SpaceCardProps {
  space: Space;
  isFavorite: boolean;
  onNavigate: () => void;
  onToggleFavorite: () => void;
}

function SpaceCard({ space, isFavorite, onNavigate, onToggleFavorite }: SpaceCardProps) {
  return (
    <div
      className="group relative p-4 rounded-lg border transition-all cursor-pointer"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
      onClick={onNavigate}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--card-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Favorite Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md transition-all"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          zIndex: 10,
          opacity: isFavorite ? 1 : 0.7,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = isFavorite ? '1' : '0.7';
        }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          size={16}
          className={isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
          style={{ color: isFavorite ? undefined : 'var(--text-muted)' }}
        />
      </button>

      {/* Space Avatar */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {space.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {space.name}
          </h3>
          <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
            {space.page_count} pages
          </p>
        </div>
      </div>

      {/* Description */}
      {space.description && (
        <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
          {space.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        {space.git_provider && (
          <span className="capitalize">{space.git_provider.replace('_', ' ')}</span>
        )}
        {space.last_synced_at && (
          <span>Synced {new Date(space.last_synced_at).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

interface SpaceListItemProps {
  space: Space;
  isFavorite: boolean;
  onNavigate: () => void;
  onToggleFavorite: () => void;
}

function SpaceListItem({ space, isFavorite, onNavigate, onToggleFavorite }: SpaceListItemProps) {
  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--card-border)',
      }}
      onClick={onNavigate}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--card-border)';
      }}
    >
      {/* Space Avatar */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {space.name.charAt(0).toUpperCase()}
      </div>

      {/* Space Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {space.name}
        </h3>
        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {space.description || `${space.page_count} pages`}
        </p>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>{space.page_count} pages</span>
        {space.git_provider && (
          <span className="capitalize">{space.git_provider.replace('_', ' ')}</span>
        )}
      </div>

      {/* Favorite Button */}
      <button
        onClick={e => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: 'var(--bg-secondary)',
        }}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          size={16}
          className={isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}
          style={{ color: isFavorite ? undefined : 'var(--text-muted)' }}
        />
      </button>
    </div>
  );
}
