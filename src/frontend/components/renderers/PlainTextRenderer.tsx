import React from 'react';

interface PlainTextRendererProps {
  content: string;
  showLineNumbers?: boolean;
}

export default function PlainTextRenderer({
  content,
  showLineNumbers = true,
}: PlainTextRendererProps) {
  const lines = content.split('\n');

  return (
    <div className="overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <pre
        className="p-4 m-0"
        style={{
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'var(--text-primary)',
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'table-row' }}>
            {showLineNumbers && (
              <span
                style={{
                  display: 'table-cell',
                  textAlign: 'right',
                  paddingRight: '1rem',
                  userSelect: 'none',
                  color: 'var(--text-tertiary)',
                  width: '1%',
                }}
              >
                {i + 1}
              </span>
            )}
            <span style={{ display: 'table-cell' }}>{line || '\n'}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
