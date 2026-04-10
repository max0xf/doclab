import React, { useState, useEffect } from 'react';
import { serviceTokensApi, ServiceToken } from '../../services/serviceTokensApi';
import { Edit, Check, X } from 'lucide-react';

interface TokenRow {
  service: string;
  serviceType: 'github' | 'bitbucket_server' | 'jira' | 'custom_header';
  baseUrl: string;
  username: string;
  token: string;
  status: 'configured' | 'not_configured';
}

export default function Configuration() {
  const [tokens, setTokens] = useState<ServiceToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    baseUrl: '',
    username: '',
    token: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const data = await serviceTokensApi.list();
      setTokens(data);
    } catch (err: any) {
      setError('Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenRow = (serviceType: TokenRow['serviceType'], serviceName: string): TokenRow => {
    const token = tokens.find(t => t.service_type === serviceType);

    if (token) {
      return {
        service: serviceName,
        serviceType,
        baseUrl: token.base_url || '',
        username: token.username || (serviceType === 'custom_header' ? 'ZTA Token' : ''),
        token: '••••••••••',
        status: 'configured',
      };
    }

    return {
      service: serviceName,
      serviceType,
      baseUrl: 'Not configured',
      username: 'Not configured',
      token: 'Not configured',
      status: 'not_configured',
    };
  };

  const rows: TokenRow[] = [
    getTokenRow('bitbucket_server', 'Bitbucket Server'),
    getTokenRow('jira', 'JIRA'),
    getTokenRow('custom_header', 'Custom Token'),
  ];

  const handleEdit = (row: TokenRow) => {
    setEditingService(row.service);
    setEditForm({
      baseUrl: row.status === 'configured' ? row.baseUrl : '',
      username: row.status === 'configured' ? row.username : '',
      token: '',
    });
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (row: TokenRow) => {
    try {
      setError(null);
      setSuccess(null);

      const data: any = {
        service_type: row.serviceType,
      };

      if (editForm.baseUrl) {
        data.base_url = editForm.baseUrl;
      }

      if (editForm.username && row.serviceType !== 'custom_header') {
        data.username = editForm.username;
      }

      if (editForm.token) {
        data.token = editForm.token;
      }

      if (row.serviceType === 'custom_header') {
        data.header_name = 'X-Zero-Trust-Token';
        data.name = 'ZTA Token';
      }

      await serviceTokensApi.save(data);
      await loadTokens();
      setEditingService(null);
      setSuccess(`${row.service} configured successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save token');
    }
  };

  const handleCancel = () => {
    setEditingService(null);
    setEditForm({ baseUrl: '', username: '', token: '' });
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Configuration</h1>
        <p className="text-text-secondary">
          Configure API tokens for Bitbucket Server, JIRA, and Custom Tokens. Tokens are stored
          encrypted and never displayed after saving.
        </p>
      </div>

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

      {/* Configuration Table */}
      <div className="bg-white rounded-lg border border-border-color overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border-color">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Base URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color">
            {rows.map(row => (
              <tr key={row.service} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                  {row.service}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {editingService === row.service ? (
                    <input
                      type="text"
                      value={editForm.baseUrl}
                      onChange={e => setEditForm({ ...editForm, baseUrl: e.target.value })}
                      placeholder={
                        row.serviceType === 'bitbucket_server'
                          ? 'https://git.acronis.work'
                          : row.serviceType === 'jira'
                            ? 'https://jira.example.com'
                            : 'X-Zero-Trust-Token'
                      }
                      className="w-full px-3 py-1 border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    row.baseUrl
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {editingService === row.service && row.serviceType !== 'custom_header' ? (
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                      placeholder={
                        row.serviceType === 'jira' ? 'your.email@example.com' : 'Username'
                      }
                      className="w-full px-3 py-1 border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    row.username
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {editingService === row.service ? (
                    <input
                      type="password"
                      value={editForm.token}
                      onChange={e => setEditForm({ ...editForm, token: e.target.value })}
                      placeholder="Enter token"
                      className="w-full px-3 py-1 border border-border-color rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    row.token
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {row.status === 'configured' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="w-3 h-3 mr-1" />
                      Configured
                    </span>
                  ) : (
                    <span className="text-text-tertiary">Not configured</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingService === row.service ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSave(row)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center px-3 py-1 border border-border-color text-sm font-medium rounded-md text-text-secondary hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(row)}
                      className="inline-flex items-center text-primary hover:text-primary-dark"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {row.status === 'configured' ? 'Edit' : 'Configure'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Important Notes */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Important Notes:</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>All tokens are encrypted before storage and never displayed after saving</li>
          <li>JIRA integration coming soon - backend support required</li>
          <li>
            Custom tokens allow you to configure any service with a custom header name (e.g.,
            X-Auth-Token, X-API-Key)
          </li>
        </ul>
      </div>
    </div>
  );
}
