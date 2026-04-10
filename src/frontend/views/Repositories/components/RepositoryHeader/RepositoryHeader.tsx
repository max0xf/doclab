import React from 'react';
import { Star, GitBranch, ChevronDown } from 'lucide-react';
import { Repository } from '../types';

interface RepositoryHeaderProps {
  repository: Repository;
  isFavorite: boolean;
  currentBranch: string;
  branches: any[];
  showBranchDropdown: boolean;
  activeTab: 'source' | 'pull-requests';
  onToggleFavorite: () => void;
  onBranchChange: (branch: string) => void;
  onToggleBranchDropdown: () => void;
  onTabChange: (tab: 'source' | 'pull-requests') => void;
}

export function RepositoryHeader({
  repository,
  isFavorite,
  currentBranch,
  branches,
  showBranchDropdown,
  activeTab,
  onToggleFavorite,
  onBranchChange,
  onToggleBranchDropdown,
  onTabChange,
}: RepositoryHeaderProps) {
  return (
    <div
      className="border-b px-6 py-4"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Repository Name and Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {repository.fullName}
          </h1>
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-full hover:bg-opacity-10 transition-colors"
            style={{
              backgroundColor: isFavorite ? 'rgba(255, 193, 7, 0.1)' : 'transparent',
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              size={20}
              fill={isFavorite ? '#ffc107' : 'none'}
              style={{ color: isFavorite ? '#ffc107' : 'var(--text-secondary)' }}
            />
          </button>
        </div>

        {/* Branch Selector */}
        <div className="relative">
          <button
            onClick={onToggleBranchDropdown}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <GitBranch size={16} />
            <span className="text-sm">{currentBranch}</span>
            <ChevronDown size={16} />
          </button>

          {showBranchDropdown && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-md shadow-lg border z-10"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="py-1 max-h-64 overflow-y-auto">
                {branches.map(branch => (
                  <button
                    key={branch.name}
                    onClick={() => {
                      onBranchChange(branch.name);
                      onToggleBranchDropdown();
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 transition-colors"
                    style={{
                      backgroundColor:
                        branch.name === currentBranch ? 'var(--bg-secondary)' : 'transparent',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {branch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {repository.description && (
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {repository.description}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => onTabChange('source')}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'source' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'source' ? '2px solid var(--primary)' : 'none',
          }}
        >
          Source
        </button>
        <button
          onClick={() => onTabChange('pull-requests')}
          className="px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: activeTab === 'pull-requests' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'pull-requests' ? '2px solid var(--primary)' : 'none',
          }}
        >
          Pull Requests
        </button>
      </div>
    </div>
  );
}
