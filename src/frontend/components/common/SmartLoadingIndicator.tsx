import React from 'react';
import { Loader2 } from 'lucide-react';
import { formatBytes } from '../../utils/performanceTracker';

interface SmartLoadingIndicatorProps {
  message?: string;
  dataLoaded?: number;
  showDataSize?: boolean;
}

export default function SmartLoadingIndicator({
  message = 'Loading...',
  dataLoaded = 0,
  showDataSize = true,
}: SmartLoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
      <div className="flex flex-col items-center gap-2">
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
          {message}
        </p>
        {showDataSize && dataLoaded > 0 && (
          <p style={{ color: 'var(--text-muted)' }} className="text-xs">
            {formatBytes(dataLoaded)} loaded
          </p>
        )}
      </div>
    </div>
  );
}
