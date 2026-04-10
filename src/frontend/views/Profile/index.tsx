import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';

export default function Profile() {
  const { user } = useAuth();
  const [_error, setError] = useState<string | null>(null);
  const [_success, setSuccess] = useState<string | null>(null);

  // Debug settings
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [cacheWritesEnabled, setCacheWritesEnabled] = useState(true);
  const [_cacheTtlHours, setCacheTtlHours] = useState(24);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    loadDebugSettings();
  }, []);

  const loadDebugSettings = async () => {
    try {
      const data = await apiClient.request<any>('/api/debug/settings/');
      setDebugModeEnabled(data.debug_mode_enabled);
      setCacheWritesEnabled(data.cache_writes_enabled);
      setCacheTtlHours(data.cache_ttl_hours);

      // Load cache stats if debug mode is enabled
      if (data.debug_mode_enabled) {
        const stats = await apiClient.request<any>('/api/debug/stats/');
        setCacheStats(stats);
      }
    } catch {
      // Debug settings not available, ignore
    }
  };

  return (
    <div className="max-w-4xl p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Profile Settings
      </h1>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">User Information</h2>
        <div className="space-y-2">
          <div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Username:
            </span>
            <span className="ml-2">{user?.username}</span>
          </div>
          <div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Email:
            </span>
            <span className="ml-2">{user?.email}</span>
          </div>
          <div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Role:
            </span>
            <span className="ml-2">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Debug Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Debug Settings</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Enable debug mode to cache API responses for faster frontend development. Responses are
          stored in the database and reused for subsequent requests.
        </p>

        <div className="space-y-4">
          {/* Debug Mode Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <label className="block text-sm font-medium">Debug Mode</label>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Cache API responses to work offline
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={debugModeEnabled}
                onChange={async e => {
                  const enabled = e.target.checked;
                  setDebugModeEnabled(enabled);

                  // Sync with localStorage for debug widget visibility
                  if (enabled) {
                    localStorage.setItem('debugMode', 'true');
                  } else {
                    localStorage.removeItem('debugMode');
                  }

                  try {
                    await apiClient.request('/api/debug/settings/', {
                      method: 'PUT',
                      body: JSON.stringify({ debug_mode_enabled: enabled }),
                    });
                    setSuccess('Debug mode ' + (enabled ? 'enabled' : 'disabled'));
                    if (enabled) {
                      loadDebugSettings();
                    }
                  } catch {
                    setError('Failed to update debug mode');
                    setDebugModeEnabled(!enabled);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {debugModeEnabled && (
            <>
              {/* Cache Writes Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium">Cache Writes</label>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Allow saving new cache entries
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cacheWritesEnabled}
                    onChange={async e => {
                      const enabled = e.target.checked;
                      setCacheWritesEnabled(enabled);
                      try {
                        await apiClient.request('/api/debug/settings/', {
                          method: 'PUT',
                          body: JSON.stringify({ cache_writes_enabled: enabled }),
                        });
                      } catch {
                        setError('Failed to update cache writes');
                        setCacheWritesEnabled(!enabled);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Cache Stats */}
              {cacheStats && (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-medium mb-2">Cache Statistics</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Entries:</span>
                      <span className="ml-2 font-medium">{cacheStats.total_entries}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Hits:</span>
                      <span className="ml-2 font-medium">{cacheStats.total_hits}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await apiClient.request('/api/debug/clear/', { method: 'DELETE' });
                        setSuccess('Cache cleared');
                        loadDebugSettings();
                      } catch {
                        setError('Failed to clear cache');
                      }
                    }}
                    className="mt-3 text-sm text-red-600 hover:text-red-800"
                  >
                    Clear Cache
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
