import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Urls } from '../types';
import { repositoryApi } from '../services/repositoryApi';
import {
  FolderGit2,
  User,
  LogOut,
  X,
  ChevronDown,
  Menu,
  Star,
  Clock,
  LayoutDashboard,
  ChevronRight,
  Code2,
  FileText,
} from 'lucide-react';
import FileTree from './Sidebar/FileTree';
import DocumentTree from './Sidebar/DocumentTree';

interface LayoutProps {
  navigate: (view: string) => void;
  children: React.ReactNode;
}

export default function Layout({ navigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [favorites, setFavorites] = useState<Array<{ id: number; repository_id: string }>>([]);
  const [recentRepos, setRecentRepos] = useState<Array<{ id: number; repository_id: string }>>([]);
  const [currentRepoId, setCurrentRepoId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [viewMode, setViewMode] = useState<'developer' | 'document'>('developer');
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [repoFilter, setRepoFilter] = useState<'favorites' | 'recent'>('favorites');
  const [repoListExpanded, setRepoListExpanded] = useState(true);

  // Auto-collapse repo list when a repo is selected
  useEffect(() => {
    if (currentRepoId) {
      setRepoListExpanded(false);
    }
  }, [currentRepoId]);
  const currentView = window.location.hash.slice(1).split('?')[0] || Urls.Dashboard;
  const currentFilter = new URLSearchParams(window.location.hash.split('?')[1] || '').get('filter');

  // Track current repo and path from URL and load view mode preference
  useEffect(() => {
    const updateCurrentRepo = async () => {
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const repoId = urlParams.get('repo');
      const path = urlParams.get('path') || '';
      setCurrentRepoId(repoId);
      setCurrentPath(path);

      if (repoId) {
        try {
          const mode = await repositoryApi.getViewMode(repoId);
          setViewMode(mode);
        } catch (e) {
          console.error('Failed to load view mode', e);
          setViewMode('developer');
        }
      }
    };

    updateCurrentRepo();
    window.addEventListener('hashchange', updateCurrentRepo);
    return () => window.removeEventListener('hashchange', updateCurrentRepo);
  }, []);

  useEffect(() => {
    // Load favorites and recent repos from database
    const loadFavorites = async () => {
      try {
        const favs = await repositoryApi.getFavorites();
        setFavorites(favs);
      } catch (e) {
        console.error('Failed to load favorites', e);
      }
    };

    const loadRecentRepos = async () => {
      try {
        const recent = await repositoryApi.getRecent();
        setRecentRepos(recent);
      } catch (e) {
        console.error('Failed to load recent repos', e);
      }
    };

    loadFavorites();
    loadRecentRepos();

    // Listen for custom event when favorites/recent are updated
    const handleRepositoriesUpdated = () => {
      loadFavorites();
      loadRecentRepos();
    };

    window.addEventListener('repositoriesUpdated', handleRepositoriesUpdated);

    return () => {
      window.removeEventListener('repositoriesUpdated', handleRepositoriesUpdated);
    };
  }, []);

  const mainMenuItems = [{ id: Urls.Dashboard, label: 'Dashboard', icon: LayoutDashboard }];

  const handleViewModeChange = async (mode: 'developer' | 'document') => {
    setViewMode(mode);
    setShowViewModeDropdown(false);
    if (currentRepoId) {
      try {
        await repositoryApi.setViewMode(currentRepoId, mode);
      } catch (e) {
        console.error('Failed to save view mode', e);
      }
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
        <nav className="py-2 flex-1">
          {/* Main menu items */}
          {mainMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id && !currentFilter;

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center py-2 mx-2 text-sm font-medium transition-all rounded-md ${
                  sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--sidebar-active)' : undefined,
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                }}
                title={sidebarCollapsed ? item.label : undefined}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                    e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <Icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'mr-2'}`} />
                {!sidebarCollapsed && item.label}
              </button>
            );
          })}

          {/* Repository Selection Section */}
          {!sidebarCollapsed && (
            <div className="mt-4">
              <div
                className="flex items-center px-4 py-1.5 text-xs font-semibold uppercase"
                style={{ color: 'var(--text-muted)' }}
              >
                Repository Selection
              </div>

              {/* Repositories menu item */}
              <button
                onClick={() => {
                  navigate(Urls.Repositories);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center py-2 mx-2 px-3 text-sm font-medium transition-all rounded-md"
                style={{
                  backgroundColor:
                    currentView === Urls.Repositories && !currentRepoId
                      ? 'var(--sidebar-active)'
                      : undefined,
                  color:
                    currentView === Urls.Repositories && !currentRepoId
                      ? 'var(--sidebar-text-active)'
                      : 'var(--sidebar-text)',
                }}
                onMouseEnter={e => {
                  if (!(currentView === Urls.Repositories && !currentRepoId)) {
                    e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                    e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!(currentView === Urls.Repositories && !currentRepoId)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-text)';
                  }
                }}
              >
                <FolderGit2 className="w-5 h-5 mr-2" />
                Repositories
              </button>

              {/* Combined Favorites/Recent Section with Filter Toggle */}
              {(favorites.length > 0 || recentRepos.length > 0) && (
                <div className="mt-2">
                  <button
                    onClick={() => setRepoListExpanded(!repoListExpanded)}
                    className="w-full flex items-center justify-between px-4 py-1.5 text-xs font-semibold hover:bg-opacity-10 hover:bg-gray-500 transition-all rounded-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="flex items-center gap-2">
                      {repoFilter === 'favorites' ? (
                        <Star className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{repoFilter === 'favorites' ? 'Favorites' : 'Recent'}</span>
                    </div>
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${
                        repoListExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {repoListExpanded && (
                    <>
                      {/* Filter Toggle */}
                      <div className="flex gap-1 px-2 py-1.5">
                        <button
                          onClick={() => setRepoFilter('favorites')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs rounded transition-all"
                          style={{
                            backgroundColor:
                              repoFilter === 'favorites' ? 'var(--sidebar-active)' : 'transparent',
                            color:
                              repoFilter === 'favorites'
                                ? 'var(--sidebar-text-active)'
                                : 'var(--sidebar-text)',
                            fontWeight: repoFilter === 'favorites' ? '600' : 'normal',
                          }}
                        >
                          <Star className="w-3 h-3" />
                          Favorites
                        </button>
                        <button
                          onClick={() => setRepoFilter('recent')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 text-xs rounded transition-all"
                          style={{
                            backgroundColor:
                              repoFilter === 'recent' ? 'var(--sidebar-active)' : 'transparent',
                            color:
                              repoFilter === 'recent'
                                ? 'var(--sidebar-text-active)'
                                : 'var(--sidebar-text)',
                            fontWeight: repoFilter === 'recent' ? '600' : 'normal',
                          }}
                        >
                          <Clock className="w-3 h-3" />
                          Recent
                        </button>
                      </div>

                      {/* Repository List */}
                      <div className="mt-1">
                        {repoFilter === 'favorites' &&
                          favorites.map(fav => {
                            const repoId = fav.repository_id;
                            const displayName = repoId.replace('_', '/');
                            const isActive = currentRepoId === repoId;
                            return (
                              <button
                                key={fav.id}
                                onClick={() => {
                                  navigate(`${Urls.Repositories}?repo=${repoId}`);
                                  setSidebarOpen(false);
                                }}
                                className="w-full flex items-center px-4 py-2 mx-2 text-sm transition-all truncate rounded-md"
                                style={{
                                  backgroundColor: isActive
                                    ? 'var(--sidebar-hover)'
                                    : 'transparent',
                                  color: isActive
                                    ? 'var(--sidebar-text-hover)'
                                    : 'var(--sidebar-text)',
                                  fontWeight: isActive ? '600' : 'normal',
                                }}
                                onMouseEnter={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                                    e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--sidebar-text)';
                                  }
                                }}
                                title={displayName}
                              >
                                {displayName}
                              </button>
                            );
                          })}
                        {repoFilter === 'recent' &&
                          recentRepos.map(recent => {
                            const repoId = recent.repository_id;
                            const displayName = repoId.replace('_', '/');
                            const isActive = currentRepoId === repoId;
                            return (
                              <button
                                key={recent.id}
                                onClick={() => {
                                  navigate(`${Urls.Repositories}?repo=${repoId}`);
                                  setSidebarOpen(false);
                                }}
                                className="w-full flex items-center px-4 py-2 mx-2 text-sm transition-all truncate rounded-md"
                                style={{
                                  backgroundColor: isActive
                                    ? 'var(--sidebar-hover)'
                                    : 'transparent',
                                  color: isActive
                                    ? 'var(--sidebar-text-hover)'
                                    : 'var(--sidebar-text)',
                                  fontWeight: isActive ? '600' : 'normal',
                                }}
                                onMouseEnter={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                                    e.currentTarget.style.color = 'var(--sidebar-text-hover)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--sidebar-text)';
                                  }
                                }}
                                title={displayName}
                              >
                                {displayName}
                              </button>
                            );
                          })}
                        {repoFilter === 'favorites' && favorites.length === 0 && (
                          <div
                            className="px-4 py-2 text-xs text-center"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            No favorites yet
                          </div>
                        )}
                        {repoFilter === 'recent' && recentRepos.length === 0 && (
                          <div
                            className="px-4 py-2 text-xs text-center"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            No recent repositories
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Selected Repository Display with View Mode Switcher */}
              {currentRepoId && (
                <div className="mt-2 mb-2">
                  <div
                    className="flex items-center px-4 py-1.5 text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Selected Repository
                  </div>
                  <div className="mx-2">
                    <div
                      className="w-full flex items-center justify-between py-2 px-3 text-sm font-semibold transition-all rounded-md"
                      style={{
                        backgroundColor: 'var(--sidebar-active)',
                        color: 'var(--sidebar-text-active)',
                      }}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <FolderGit2 className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{currentRepoId.replace('_', '/')}</span>
                      </div>
                      <div className="relative ml-2">
                        <button
                          onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-opacity-20 hover:bg-white transition-all"
                          title="Switch view mode"
                        >
                          {viewMode === 'developer' ? (
                            <Code2 className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {showViewModeDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowViewModeDropdown(false)}
                            />
                            <div
                              className="absolute right-0 top-full mt-1 rounded-lg shadow-lg z-20 min-w-[160px]"
                              style={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)',
                                border: '1px solid',
                              }}
                            >
                              <button
                                onClick={() => handleViewModeChange('developer')}
                                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-all rounded-t-lg"
                                style={{
                                  color: 'var(--text-primary)',
                                  backgroundColor:
                                    viewMode === 'developer'
                                      ? 'var(--bg-secondary)'
                                      : 'transparent',
                                  fontWeight: viewMode === 'developer' ? '600' : 'normal',
                                }}
                                onMouseEnter={e => {
                                  if (viewMode !== 'developer') {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (viewMode !== 'developer') {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <Code2 className="w-4 h-4" />
                                Developer
                              </button>
                              <button
                                onClick={() => handleViewModeChange('document')}
                                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-all rounded-b-lg"
                                style={{
                                  color: 'var(--text-primary)',
                                  backgroundColor:
                                    viewMode === 'document' ? 'var(--bg-secondary)' : 'transparent',
                                  fontWeight: viewMode === 'document' ? '600' : 'normal',
                                }}
                                onMouseEnter={e => {
                                  if (viewMode !== 'document') {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (viewMode !== 'document') {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <FileText className="w-4 h-4" />
                                Document
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File/Document Tree Section */}
          {!sidebarCollapsed && currentRepoId && (
            <div className="mt-4">
              {viewMode === 'developer' ? (
                <FileTree repositoryId={currentRepoId} currentPath={currentPath} />
              ) : (
                <DocumentTree repositoryId={currentRepoId} currentPath={currentPath} />
              )}
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
                    <LayoutDashboard size={14} />
                    Configuration
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
      <div className={sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}>
        <main>{children}</main>
      </div>
    </div>
  );
}
