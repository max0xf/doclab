import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/apiClient';
import { apiTokensApi, ApiToken } from '../../services/apiTokensApi';
import { Copy, Trash2, Plus } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API Tokens
  const [apiTokens, setApiTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState<'30' | '365' | 'custom'>('30');
  const [customExpiryDays, setCustomExpiryDays] = useState('90');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  // Debug settings
  const [debugModeEnabled, setDebugModeEnabled] = useState(false);
  const [cacheWritesEnabled, setCacheWritesEnabled] = useState(true);
  const [_cacheTtlHours, setCacheTtlHours] = useState(24);
  const [cacheStats, setCacheStats] = useState<any>(null);

  useEffect(() => {
    loadApiTokens();
    loadDebugSettings();
  }, []);

  const loadApiTokens = async () => {
    try {
      const tokens = await apiTokensApi.list();
      setApiTokens(tokens);
    } catch (err: any) {
      console.error('Failed to load API tokens:', err);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setError('Please enter a token name');
      return;
    }

    setIsCreatingToken(true);
    setError(null);
    setSuccess(null);

    try {
      const expiresInDays =
        newTokenExpiry === 'custom' ? parseInt(customExpiryDays) : parseInt(newTokenExpiry);

      const token = await apiTokensApi.create({
        name: newTokenName,
        expires_in_days: expiresInDays,
      });

      setCreatedToken(token.token || '');
      setNewTokenName('');
      setSuccess(
        "API token created successfully! Make sure to copy it now - you won't be able to see it again."
      );
      await loadApiTokens();
    } catch (err: any) {
      setError(err.message || 'Failed to create API token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleDeleteToken = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the token "${name}"?`)) {
      return;
    }

    try {
      await apiTokensApi.delete(id);
      setSuccess(`Token "${name}" deleted successfully`);
      await loadApiTokens();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete token');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Token copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

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

      {/* API Tokens */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">API Tokens</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Create API tokens to access the DocLab API programmatically. Tokens are shown only once
          upon creation.
        </p>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Created Token Display */}
        {createdToken && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Your new API token:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-white border border-blue-300 rounded text-sm font-mono break-all">
                {createdToken}
              </code>
              <button
                onClick={() => copyToClipboard(createdToken)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Make sure to copy this token now. You won't be able to see it again!
            </p>
          </div>
        )}

        {/* Create Token Form */}
        <form
          onSubmit={handleCreateToken}
          className="mb-6 p-4 border border-border-color rounded-lg"
        >
          <h3 className="text-sm font-semibold mb-3">Create New Token</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Token Name</label>
              <input
                type="text"
                value={newTokenName}
                onChange={e => setNewTokenName(e.target.value)}
                placeholder="e.g., CI/CD Pipeline, Testing"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiration</label>
              <div className="flex gap-2">
                <select
                  value={newTokenExpiry}
                  onChange={e => setNewTokenExpiry(e.target.value as '30' | '365' | 'custom')}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="30">1 Month (30 days)</option>
                  <option value="365">1 Year (365 days)</option>
                  <option value="custom">Custom</option>
                </select>
                {newTokenExpiry === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={customExpiryDays}
                    onChange={e => setCustomExpiryDays(e.target.value)}
                    placeholder="Days"
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isCreatingToken}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              {isCreatingToken ? 'Creating...' : 'Create Token'}
            </button>
          </div>
        </form>

        {/* Token List */}
        {apiTokens.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Active Tokens</h3>
            <div className="space-y-2">
              {apiTokens.map(token => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-3 border border-border-color rounded-lg hover:bg-bg-secondary"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{token.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Created: {new Date(token.created_at).toLocaleDateString()}
                      {token.expires_at && (
                        <> • Expires: {new Date(token.expires_at).toLocaleDateString()}</>
                      )}
                      {token.last_used_at && (
                        <> • Last used: {new Date(token.last_used_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteToken(token.id, token.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete token"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
