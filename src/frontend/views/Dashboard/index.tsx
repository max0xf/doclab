import React, { useState, useEffect } from 'react';
import { Star, Clock, Plus, ArrowRight } from 'lucide-react';
import type { Space, UserSpacePreference } from '../../types';
import spaceApi from '../../services/spaceApi';
import { Urls } from '../../types';
import CreateSpaceModal from '../../components/CreateSpaceModal';

interface DashboardProps {
  navigate: (view: string) => void;
}

export default function Dashboard({ navigate }: DashboardProps) {
  const [favorites, setFavorites] = useState<UserSpacePreference[]>([]);
  const [recent, setRecent] = useState<UserSpacePreference[]>([]);
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { favorites: favs, recent: rec, all } = await spaceApi.getMySpaces();
        setFavorites(favs);
        setRecent(rec);
        setAllSpaces(all);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleNavigateToSpace = (spaceSlug: string) => {
    navigate(`${Urls.Spaces}?space=${spaceSlug}`);
  };

  const handleToggleFavorite = async (spaceSlug: string) => {
    const isFavorite = favorites.some(f => f.spaceSlug === spaceSlug);
    try {
      if (isFavorite) {
        await spaceApi.removeFromFavorites(spaceSlug);
        setFavorites(favorites.filter(f => f.spaceSlug !== spaceSlug));
      } else {
        const newPref = await spaceApi.addToFavorites(spaceSlug);
        setFavorites([...favorites, newPref]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSpaceCreated = async () => {
    // Reload spaces after creation
    try {
      const { favorites: favs, recent: rec, all } = await spaceApi.getMySpaces();
      setFavorites(favs);
      setRecent(rec);
      setAllSpaces(all);
    } catch (error) {
      console.error('Failed to reload spaces:', error);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </div>
    );
  }

  const favoriteSpaces = favorites
    .map(f => allSpaces.find(s => s.slug === f.spaceSlug))
    .filter(Boolean) as Space[];
  const recentSpaces = recent
    .filter(r => !favorites.some(f => f.spaceSlug === r.spaceSlug))
    .map(r => allSpaces.find(s => s.slug === r.spaceSlug))
    .filter(Boolean)
    .slice(0, 6) as Space[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="border-b px-6 py-6" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Welcome back! Here are your spaces.
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
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Favorite Spaces */}
        {favoriteSpaces.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-semibold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <Star size={20} className="text-yellow-500" />
                Favorite Spaces
              </h2>
              {favoriteSpaces.length > 6 && (
                <button
                  onClick={() => navigate(Urls.Spaces)}
                  className="text-sm flex items-center gap-1"
                  style={{ color: 'var(--primary)' }}
                >
                  View all
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteSpaces.slice(0, 6).map(space => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isFavorite={true}
                  onNavigate={() => handleNavigateToSpace(space.slug)}
                  onToggleFavorite={() => handleToggleFavorite(space.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent Spaces */}
        {recentSpaces.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-semibold flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <Clock size={20} style={{ color: 'var(--text-secondary)' }} />
                Recent Spaces
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSpaces.map(space => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  isFavorite={false}
                  onNavigate={() => handleNavigateToSpace(space.slug)}
                  onToggleFavorite={() => handleToggleFavorite(space.slug)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {favoriteSpaces.length === 0 && recentSpaces.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <Star size={32} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No spaces yet
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Create your first space to get started
            </p>
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
          </div>
        )}

        {/* Quick Actions */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate(Urls.Spaces)}
              className="p-4 rounded-lg border text-left transition-all"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
              }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Browse All Spaces
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                View and search all available spaces
              </div>
            </button>

            <button
              onClick={() => navigate(Urls.Spaces)}
              className="p-4 rounded-lg border text-left transition-all"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
              }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Create New Space
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Set up a new documentation space
              </div>
            </button>

            <button
              onClick={() => navigate(Urls.Configuration)}
              className="p-4 rounded-lg border text-left transition-all"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--card-border)';
              }}
            >
              <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Configuration
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Manage settings and preferences
              </div>
            </button>
          </div>
        </section>
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
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
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
