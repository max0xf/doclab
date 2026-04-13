import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div
      className="prose prose-sm max-w-none p-6"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const inline = !className;

            if (inline) {
              return (
                <code
                  className={className}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875em',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const code = String(children).replace(/\n$/, '');

            return (
              <div
                className="my-4 rounded-lg overflow-hidden border"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {language && (
                  <div
                    className="px-3 py-1 text-xs font-mono border-b"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {language}
                  </div>
                )}
                <Highlight theme={themes.vsLight} code={code} language={language || 'text'}>
                  {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <pre
                      className={className}
                      style={{
                        ...style,
                        margin: 0,
                        padding: '1rem',
                        backgroundColor: 'var(--bg-primary)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold mt-4 mb-2" style={{ color: 'var(--text-primary)' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4" style={{ color: 'var(--text-primary)' }}>
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline hover:opacity-80"
              style={{ color: '#0066cc' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul
              className="list-disc list-inside mb-4 space-y-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className="list-decimal list-inside mb-4 space-y-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-4 my-4 italic"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border"
                style={{
                  borderColor: 'var(--border-color)',
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className="border px-4 py-2 text-left font-semibold"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="border px-4 py-2"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
