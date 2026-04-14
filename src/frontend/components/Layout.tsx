import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Urls } from '../types';
import type { Space, UserSpacePreference } from '../types';
import spaceApi from '../services/spaceApi';
import { User, LogOut, X, ChevronDown, Menu, Home, Settings, Star } from 'lucide-react';
import SpaceTree from './SpaceTree';
import MainView from './MainView';

interface LayoutProps {
  navigate: (view: string) => void;
  children: React.ReactNode;
}

export default function Layout({ navigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mySpacesExpanded, setMySpacesExpanded] = useState(true);
  const [favorites, setFavorites] = useState<UserSpacePreference[]>([]);
  const [recent, setRecent] = useState<UserSpacePreference[]>([]);
  const [allSpaces, setAllSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentView = window.location.hash.slice(1).split('?')[0] || Urls.Dashboard;

  // Load spaces and track current space from URL
  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const { favorites: favs, recent: rec, all } = await spaceApi.getMySpaces();
        setFavorites(favs);
        setRecent(rec);
        setAllSpaces(all);

        // Get current space from URL
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const spaceSlug = urlParams.get('space');
        if (spaceSlug) {
          const space = all.find(s => s.slug === spaceSlug);
          setSelectedSpace(space || null);
        }
      } catch (error) {
        console.error('Failed to load spaces:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSpaces();
  }, []);

  // Handle hash changes separately
  useEffect(() => {
    const handleHashChange = async () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const spaceSlug = urlParams.get('space');
      if (spaceSlug && allSpaces.length > 0) {
        const space = allSpaces.find(s => s.slug === spaceSlug);
        setSelectedSpace(space || null);

        // Mark as visited and reload recent
        if (space) {
          try {
            await spaceApi.markVisited(spaceSlug);
            const recentSpaces = await spaceApi.listRecent(10);
            setRecent(recentSpaces);
          } catch (error) {
            console.error('Failed to mark space as visited:', error);
          }
        }
      } else {
        setSelectedSpace(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Call immediately on mount
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [allSpaces]);

  const handleSelectSpace = async (space: Space) => {
    // Fetch fresh space data to ensure we have latest git_default_branch
    try {
      const freshSpace = await spaceApi.getSpace(space.slug);
      setSelectedSpace(freshSpace);
      // Mark as visited for recent tracking
      await spaceApi.markVisited(space.slug);
      // Reload recent to show the newly visited space
      const recentSpaces = await spaceApi.listRecent(10);
      setRecent(recentSpaces);
    } catch (error) {
      console.error('Failed to fetch space details:', error);
      setSelectedSpace(space); // Fallback to cached data
    }
    navigate(`${Urls.Spaces}?space=${space.slug}`);
    setSidebarOpen(false);
  };

  // Will be used when we add favorite toggle buttons to space items
  const _handleToggleFavorite = async (spaceSlug: string) => {
    const pref = favorites.find(f => f.space_slug === spaceSlug);
    try {
      if (pref) {
        await spaceApi.removeFromFavorites(spaceSlug);
        setFavorites(favorites.filter(f => f.space_slug !== spaceSlug));
      } else {
        const newPref = await spaceApi.addToFavorites(spaceSlug);
        setFavorites([...favorites, newPref]);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-30 transform transition-all duration-300 ease-in-out lg:translate-x-0 overflow-y-auto overflow-x-hidden flex flex-col border-r ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
        style={{
          background: 'var(--sidebar-bg)',
          backgroundColor: 'var(--sidebar-bg-solid, var(--sidebar-bg))',
          borderColor: 'var(--sidebar-border)',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: 'var(--sidebar-header-bg)' }}>
          <div
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3`}
          >
            {!sidebarCollapsed && (
              <h1
                className="text-xs font-semibold uppercase tracking-wide truncate"
                style={{ color: 'var(--sidebar-header-text, #ffffff)' }}
              >
                DocLab
              </h1>
            )}
            <button
              onClick={() => {
                if (sidebarOpen) {
                  setSidebarOpen(false);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className="p-1.5 rounded-md hover:bg-opacity-10 hover:bg-gray-500 transition-all lg:block hidden"
              style={{ color: 'var(--sidebar-text)' }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5"
              style={{ color: 'var(--sidebar-text)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="py-2 flex-1">
          {/* Dashboard Link */}
          {!sidebarCollapsed && (
            <button
              onClick={() => {
                navigate(Urls.Dashboard);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center py-2 mx-2 px-3 text-sm font-medium transition-all rounded-md"
              style={{
                backgroundColor:
                  currentView === Urls.Dashboard ? 'var(--sidebar-active)' : undefined,
                color:
                  currentView === Urls.Dashboard
                    ? 'var(--sidebar-text-active)'
                    : 'var(--sidebar-text)',
              }}
              onMouseEnter={e => {
                if (currentView !== Urls.Dashboard) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                }
              }}
              onMouseLeave={e => {
                if (currentView !== Urls.Dashboard) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--sidebar-text)';
                }
              }}
            >
              <Home className="w-5 h-5 mr-2" />
              Dashboard
            </button>
          )}

          {/* My Spaces Section */}
          {!sidebarCollapsed && !loading && (
            <div className="mt-4">
              <div className="w-full flex items-center justify-between px-4 py-1.5">
                <button
                  onClick={() => navigate(Urls.Spaces)}
                  className="flex-1 text-left text-xs font-semibold uppercase hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  My Spaces
                </button>
                <button
                  onClick={() => setMySpacesExpanded(!mySpacesExpanded)}
                  className="p-1 hover:bg-sidebar-hover rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mySpacesExpanded ? '' : '-rotate-90'}`}
                  />
                </button>
              </div>

              {/* Favorites and Recent - plain list without delimiters */}
              {mySpacesExpanded && (
                <>
                  {/* Favorites with star icon */}
                  {favorites.map(pref => {
                    const space = allSpaces.find(s => s.slug === pref.space_slug);
                    if (!space) {
                      return null;
                    }
                    const isSelected = selectedSpace?.slug === space.slug;

                    return (
                      <button
                        key={space.id}
                        onClick={() => handleSelectSpace(space)}
                        className="w-full flex items-center gap-2 py-1 px-3 text-xs transition-all rounded"
                        style={{
                          backgroundColor: isSelected ? 'var(--sidebar-active)' : undefined,
                          color: isSelected ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {space.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 truncate font-medium">{space.name}</div>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      </button>
                    );
                  })}

                  {/* Recent (non-favorites) with subtle styling */}
                  {recent
                    .filter(r => !favorites.some(f => f.space_slug === r.space_slug))
                    .slice(0, 5)
                    .map(pref => {
                      const space = allSpaces.find(s => s.slug === pref.space_slug);
                      if (!space) {
                        return null;
                      }
                      const isSelected = selectedSpace?.slug === space.slug;

                      return (
                        <button
                          key={space.id}
                          onClick={() => handleSelectSpace(space)}
                          className="w-full flex items-center gap-2 py-1 px-3 text-xs transition-all rounded"
                          style={{
                            backgroundColor: isSelected ? 'var(--sidebar-active)' : undefined,
                            color: isSelected
                              ? 'var(--sidebar-text-active)'
                              : 'var(--sidebar-text)',
                            opacity: 0.7,
                          }}
                          onMouseEnter={e => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                            }
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                            e.currentTarget.style.opacity = '0.7';
                          }}
                        >
                          <div className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {space.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 truncate font-medium">{space.name}</div>
                        </button>
                      );
                    })}
                </>
              )}
            </div>
          )}

          {/* Selected Space Tree */}
          {!sidebarCollapsed && selectedSpace && (
            <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--sidebar-divider)' }}>
              <SpaceTree
                space={selectedSpace}
                onSelectFile={setSelectedPath}
                spaceName={selectedSpace.name}
              />
            </div>
          )}
        </nav>

        {/* User menu at bottom */}
        <div
          className="px-4 py-3 border-t mt-auto"
          style={{ borderColor: 'var(--sidebar-divider)' }}
        >
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-2 py-2 rounded-md transition-all hover:bg-opacity-10 hover:bg-gray-500 ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3'
              }`}
              style={{ color: 'var(--sidebar-text)' }}
              title={sidebarCollapsed ? user?.displayName || user?.username : undefined}
            >
              <User size={16} />
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm flex-1 text-left truncate">
                    {user?.displayName || user?.username}
                  </span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-lg z-20"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    border: '1px solid',
                  }}
                >
                  <button
                    onClick={() => {
                      navigate(Urls.Profile);
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-all rounded-t-xl"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <User size={14} />
                    Profile Settings
                  </button>
                  <div style={{ borderTop: '1px solid var(--border-color)' }} />
                  <button
                    onClick={() => {
                      navigate(Urls.Configuration);
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-all"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Settings size={14} />
                    Configuration
                  </button>
                  <button
                    onClick={() => {
                      navigate(Urls.SpaceConfiguration);
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-all"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Settings size={14} />
                    Space Configuration
                  </button>
                  <div style={{ borderTop: '1px solid var(--border-color)' }} />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-danger transition-all rounded-b-xl"
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col h-screen ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Mobile menu button */}
        <div className="lg:hidden p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <main className="flex-1 flex flex-col overflow-hidden">
          <MainView selectedSpace={selectedSpace} selectedPath={selectedPath}>
            {children}
          </MainView>
        </main>
      </div>
    </div>
  );
}
