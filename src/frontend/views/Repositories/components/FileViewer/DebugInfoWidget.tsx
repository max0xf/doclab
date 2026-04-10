import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Copy, Check } from 'lucide-react';

interface DebugInfoWidgetProps {
  repository: {
    id: string;
    fullName: string;
  };
  file: {
    name: string;
    path: string;
    size?: number;
  };
  fileContent: string;
  enrichments: any[];
  fileComments: any[];
  contentType?: any;
  rendererName?: string;
}

export function DebugInfoWidget({
  repository,
  file,
  fileContent,
  enrichments,
  fileComments,
  rendererName,
}: DebugInfoWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOriginalContent, setShowOriginalContent] = useState(false);
  const [showEnrichments, setShowEnrichments] = useState(false);
  const [showFinalContent, setShowFinalContent] = useState(false);
  const [showRenderingRules, setShowRenderingRules] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyDebugInfo = () => {
    const debugText = `
=== DEBUG INFO ===

Repository: ${repoFullName}
File: ${file.path} (${file.size || 0} bytes, ${fileContent.split('\n').length} lines)
Renderer: ${rendererName}

Enrichments: ${enrichments.length} total
${enrichments.map((e, _i) => `- ${e.type} [${e.category}] (priority ${e.priority})`).join('\n')}

${enrichments
  .map((enrichment, _idx) => {
    if (enrichment.type === 'pr-diff') {
      const data = enrichment.data;
      const prNumber = data?.prNumber;
      const hunkCount = data?.hunks?.length || 0;
      const totalDiffLines =
        data?.hunks?.reduce((sum: number, h: any) => sum + (h.lines?.length || 0), 0) || 0;
      const diffLineBreakdown =
        data?.hunks?.reduce((acc: any, h: any) => {
          h.lines?.forEach((line: any) => {
            acc[line.type] = (acc[line.type] || 0) + 1;
          });
          return acc;
        }, {}) || {};
      return `
PR Diff #${prNumber}: ${hunkCount} hunks, ${totalDiffLines} lines
${Object.entries(diffLineBreakdown)
  .map(([type, count]) => `  ${type}: ${count}`)
  .join('\n')}

Hunks:
${data.hunks
  ?.map(
    (hunk: any, i: number) => `
  Hunk ${i + 1}: @@ -${hunk.old_start},${hunk.old_lines} +${hunk.new_start},${hunk.new_lines} @@
${hunk.lines?.map((line: any) => `    [${line.type}] ${line.old_line_number || '-'}/${line.new_line_number || '-'}: ${line.content}`).join('\n')}
`
  )
  .join('\n')}
`;
    } else if (enrichment.type === 'user-changes') {
      const data = enrichment.data;
      const hunkCount = data?.hunks?.length || 0;
      const totalLines =
        data?.hunks?.reduce((sum: number, h: any) => sum + (h.lines?.length || 0), 0) || 0;
      return `
User Changes: ${hunkCount} hunks, ${totalLines} lines
${Object.entries(
  data?.hunks?.reduce((acc: any, hunk: any) => {
    hunk.changes?.forEach((line: any) => {
      acc[line.type] = (acc[line.type] || 0) + 1;
    });
    return acc;
  }, {}) || {}
)
  .map(([type, count]) => `  ${type}: ${count}`)
  .join('\n')}

Hunks:
${data.hunks
  ?.map(
    (hunk: any, i: number) => `
  Hunk ${i + 1}: @@ -${hunk.old_start},${hunk.old_lines} +${hunk.new_start},${hunk.new_lines} @@
${hunk.lines?.map((line: any) => `    [${line.type}] ${line.old_line_number || '-'}/${line.new_line_number || '-'}: ${line.content}`).join('\n')}
`
  )
  .join('\n')}
`;
    }
    return '';
  })
  .join('\n')}

${
  fileComments.length > 0
    ? `
Comments:
${fileComments
  .map(
    (c, i) => `
  Comment ${i + 1}:
    Line: ${c.computed_line_number}
    Author: ${c.author_name}
    Created: ${new Date(c.created_at).toLocaleString()}
    Text: ${c.text}
`
  )
  .join('\n')}
`
    : ''
}

API Endpoints:
- Content: /api/repositories/v1/${repository.id}/content/${file.path}
${enrichments
  .filter(e => e.type === 'pr-diff' && e.data?.prNumber)
  .map(
    e =>
      `- PR Diff: /api/git/v1/repos/${repoFullName}/pulls/${e.data.prNumber}/diff/?file_path=${file.path}`
  )
  .join('\n')}
- Comments: /api/comments/v1/file-comments/?repository_id=${repository.id}&file_path=${file.path}
`.trim();

    navigator.clipboard.writeText(debugText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Parse repository info
  const repoFullName = repository.fullName;

  return (
    <div
      className="border-b"
      style={{
        backgroundColor: '#fff9e6',
        borderColor: '#ffc107',
      }}
    >
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-6 py-2 flex items-center gap-2 hover:bg-yellow-50 transition-colors"
        >
          <Bug size={14} className="text-yellow-700" />
          <span className="text-xs font-semibold text-yellow-900">Debug Info</span>
          {isExpanded ? (
            <ChevronUp size={14} className="ml-auto text-yellow-700" />
          ) : (
            <ChevronDown size={14} className="ml-auto text-yellow-700" />
          )}
        </button>
        <button
          onClick={copyDebugInfo}
          className="px-4 py-2 hover:bg-yellow-50 transition-colors"
          title="Copy debug info to clipboard"
        >
          {copied ? (
            <Check size={14} className="text-green-700" />
          ) : (
            <Copy size={14} className="text-yellow-700" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-6 pb-3 font-mono text-xs text-yellow-900 max-h-96 overflow-y-auto">
          {/* Repository */}
          <div className="text-yellow-900">
            <span className="font-semibold">Repository:</span> {repoFullName}
          </div>

          {/* File */}
          <div className="mb-2">
            <span className="font-semibold">File:</span> {file.path}{' '}
            <span className="text-yellow-700">
              ({file.size || 0} bytes, {fileContent.split('\n').length} lines)
            </span>
          </div>

          {/* Rendering */}
          <div className="mb-2">
            <span className="font-semibold">Renderer:</span> {rendererName || 'N/A'}
          </div>

          {/* Comments Details */}
          {fileComments.length > 0 && (
            <div className="mb-2">
              <div className="font-semibold text-yellow-900">
                Comments: {fileComments.length} total
              </div>
              <div className="ml-4 mt-1 text-yellow-700">
                {fileComments.map((c, i) => (
                  <div key={i} className="mb-2">
                    <div className="font-semibold">
                      Line {c.computed_line_number} - {c.author_name}
                    </div>
                    <div className="font-mono text-xs whitespace-pre-wrap">{c.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Endpoints */}
          <div className="text-yellow-700 break-all mb-4">
            <div>
              Content: /api/repositories/v1/{repository.id}/content/{file.path}
            </div>
            {enrichments
              .filter(e => e.type === 'pr-diff' && e.data?.prNumber)
              .map((e, i) => (
                <div key={i}>
                  PR Diff: /api/git/v1/repos/{repoFullName}/pulls/{e.data.prNumber}/diff/?file_path=
                  {file.path}
                </div>
              ))}
            <div>
              Comments: /api/comments/v1/file-comments/?repository_id={repository.id}&file_path=
              {file.path}
            </div>
          </div>

          {/* 1. Original Content */}
          <div className="mb-2 border-t pt-2" style={{ borderColor: '#ffc107' }}>
            <button
              onClick={() => setShowOriginalContent(!showOriginalContent)}
              className="font-semibold text-yellow-900 hover:text-yellow-700 flex items-center gap-2"
            >
              {showOriginalContent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              1. Original Content ({fileContent.split('\n').length} lines)
            </button>
            {showOriginalContent && (
              <div className="ml-4 mt-2 max-h-60 overflow-y-auto text-yellow-700 font-mono text-xs">
                {fileContent.split('\n').map((line, i) => (
                  <div key={i}>
                    <span className="text-yellow-900">{i + 1}:</span> {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Enrichments */}
          <div className="mb-2 border-t pt-2" style={{ borderColor: '#ffc107' }}>
            <button
              onClick={() => setShowEnrichments(!showEnrichments)}
              className="font-semibold text-yellow-900 hover:text-yellow-700 flex items-center gap-2"
            >
              {showEnrichments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              2. Enrichments ({enrichments.length} total)
            </button>
            {showEnrichments && (
              <div className="ml-4 mt-2 space-y-3">
                {/* PR Diff Enrichment */}
                {enrichments
                  .filter(e => e.type === 'pr-diff')
                  .map((enrichment, idx) => {
                    const data = enrichment.data;
                    const prNumber = data?.prNumber;
                    const hunkCount = data?.hunks?.length || 0;
                    const totalLines =
                      data?.hunks?.reduce(
                        (sum: number, h: any) => sum + (h.lines?.length || 0),
                        0
                      ) || 0;
                    return (
                      <div key={idx} className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                        <div className="font-semibold text-yellow-900">PR Diff Enrichment</div>
                        <div className="text-yellow-700 text-xs">
                          <div>
                            <span className="font-semibold">Type:</span> {enrichment.type} [
                            {enrichment.category}]
                          </div>
                          <div>
                            <span className="font-semibold">Source:</span> PR #{prNumber}
                          </div>
                          <div>
                            <span className="font-semibold">Priority:</span> {enrichment.priority}
                          </div>
                          <div>
                            <span className="font-semibold">Data:</span> {hunkCount} hunks,{' '}
                            {totalLines} lines
                          </div>
                          <div className="mt-1 max-h-60 overflow-y-auto">
                            {data.hunks?.map((hunk: any, hi: number) => (
                              <div key={hi} className="mt-1">
                                <div className="font-semibold">
                                  Hunk {hi + 1}: @@ -{hunk.old_start},{hunk.old_lines} +
                                  {hunk.new_start},{hunk.new_lines} @@
                                </div>
                                {hunk.lines?.map((line: any, li: number) => (
                                  <div key={li}>
                                    [{line.type}] {line.old_line_number || '-'}/
                                    {line.new_line_number || '-'}: {line.content}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* User Changes Enrichment */}
                {enrichments
                  .filter(e => e.type === 'user-changes')
                  .map((enrichment, idx) => {
                    const data = enrichment.data;
                    const hunkCount = data?.hunks?.length || 0;
                    const totalLines =
                      data?.hunks?.reduce(
                        (sum: number, h: any) => sum + (h.lines?.length || 0),
                        0
                      ) || 0;
                    return (
                      <div key={idx} className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                        <div className="font-semibold text-yellow-900">User Changes Enrichment</div>
                        <div className="text-yellow-700 text-xs">
                          <div>
                            <span className="font-semibold">Type:</span> {enrichment.type} [
                            {enrichment.category}]
                          </div>
                          <div>
                            <span className="font-semibold">Source:</span>{' '}
                            {data.prTitle || 'Your Changes'}
                          </div>
                          <div>
                            <span className="font-semibold">Priority:</span> {enrichment.priority}
                          </div>
                          <div>
                            <span className="font-semibold">Data:</span> {hunkCount} hunks,{' '}
                            {totalLines} lines
                          </div>
                          <div className="mt-1 max-h-60 overflow-y-auto">
                            {data.hunks?.map((hunk: any, hi: number) => (
                              <div key={hi} className="mt-1">
                                <div className="font-semibold">
                                  Hunk {hi + 1}: @@ -{hunk.old_start},{hunk.old_lines} +
                                  {hunk.new_start},{hunk.new_lines} @@
                                </div>
                                {hunk.lines?.map((line: any, li: number) => (
                                  <div key={li}>
                                    [{line.type}] {line.old_line_number || '-'}/
                                    {line.new_line_number || '-'}: {line.content}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer font-semibold">
                              Full JSON Data
                            </summary>
                            <pre className="mt-1 text-xs overflow-x-auto">
                              {JSON.stringify(enrichment, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    );
                  })}

                {/* Other Enrichments */}
                {enrichments
                  .filter(e => e.type !== 'pr-diff' && e.type !== 'user-changes')
                  .map((enr, i) => (
                    <div key={i} className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                      <div className="font-semibold text-yellow-900">Enrichment: {enr.type}</div>
                      <div className="text-yellow-700 text-xs">
                        <div>
                          <span className="font-semibold">Type:</span> {enr.type} [{enr.category}]
                        </div>
                        <div>
                          <span className="font-semibold">Priority:</span> {enr.priority}
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold">Full JSON Data</summary>
                          <pre className="mt-1 text-xs overflow-x-auto">
                            {JSON.stringify(enr, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 3. Final Aggregated Content */}
          <div className="mb-2 border-t pt-2" style={{ borderColor: '#ffc107' }}>
            <button
              onClick={() => setShowFinalContent(!showFinalContent)}
              className="font-semibold text-yellow-900 hover:text-yellow-700 flex items-center gap-2"
            >
              {showFinalContent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              3. Final Aggregated Content (Original + Enrichments)
            </button>
            {showFinalContent && (
              <div className="ml-4 mt-2 text-yellow-700 text-xs">
                <div className="mb-2">
                  <span className="font-semibold text-yellow-900">Ephemeral State:</span> Base
                  content with enrichments applied
                </div>
                <div className="max-h-60 overflow-y-auto font-mono">
                  {enrichments.some(e => e.category === 'diff') ? (
                    <div>
                      <div className="text-yellow-900 mb-1">With Diff Enrichments applied:</div>
                      {(() => {
                        const lines = fileContent.split('\n');
                        const activeDiff = enrichments
                          .filter(e => e.category === 'diff')
                          .sort((a, b) => b.priority - a.priority)[0];

                        if (!activeDiff?.data?.hunks) {
                          return lines.map((line, i) => (
                            <div key={i} className="text-yellow-700">
                              {i + 1}: {line}
                            </div>
                          ));
                        }

                        let result: any[] = [];
                        let lineIdx = 0;

                        activeDiff.data.hunks?.forEach((hunk: any) => {
                          // Add lines before hunk
                          while (lineIdx < hunk.new_start - 1) {
                            result.push({
                              type: 'context',
                              num: lineIdx + 1,
                              content: lines[lineIdx],
                            });
                            lineIdx++;
                          }

                          // Add hunk lines
                          hunk.lines?.forEach((line: any) => {
                            if (line.type === 'delete') {
                              result.push({
                                type: 'delete',
                                num: line.old_line_number,
                                content: line.content,
                              });
                            } else if (line.type === 'add') {
                              result.push({
                                type: 'add',
                                num: line.new_line_number,
                                content: line.content,
                              });
                              lineIdx++;
                            } else {
                              result.push({
                                type: 'context',
                                num: line.new_line_number,
                                content: line.content,
                              });
                              lineIdx++;
                            }
                          });
                        });

                        // Add remaining lines
                        while (lineIdx < lines.length) {
                          result.push({
                            type: 'context',
                            num: lineIdx + 1,
                            content: lines[lineIdx],
                          });
                          lineIdx++;
                        }

                        return result.map((line, i) => (
                          <div
                            key={i}
                            className={
                              line.type === 'add'
                                ? 'bg-green-100'
                                : line.type === 'delete'
                                  ? 'bg-red-100'
                                  : ''
                            }
                          >
                            <span className="text-yellow-900">
                              {line.type === 'delete' ? `${line.num}/-` : `-/${line.num}`}:
                            </span>{' '}
                            {line.content}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div>No enrichments applied - same as original content</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Rendering Rules */}
          <div className="mb-2 border-t pt-2" style={{ borderColor: '#ffc107' }}>
            <button
              onClick={() => setShowRenderingRules(!showRenderingRules)}
              className="font-semibold text-yellow-900 hover:text-yellow-700 flex items-center gap-2"
            >
              {showRenderingRules ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              4. Rendering Rules for {rendererName}
            </button>
            {showRenderingRules && (
              <div className="ml-4 mt-2 text-yellow-700 text-xs space-y-2">
                <div>
                  <span className="font-semibold text-yellow-900">Renderer:</span> {rendererName}
                </div>

                <div className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                  <div className="font-semibold text-yellow-900">PR Diff Enrichment Rules:</div>
                  <div>• Added lines: Green background (#e6ffed), show in ephemeral content</div>
                  <div>
                    • Deleted lines: Red background (#ffeef0), insert into ephemeral content with
                    strikethrough
                  </div>
                  <div>• Context lines: No highlighting, show normally</div>
                  <div>• Line numbers: Show old/new line numbers in gutter</div>
                </div>

                <div className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                  <div className="font-semibold text-yellow-900">Comment Enrichment Rules:</div>
                  <div>• Display: Comment icon in line gutter</div>
                  <div>• Interaction: Click to show comment panel</div>
                  <div>• Highlight: Yellow background on hover</div>
                </div>

                <div className="border-l-2 pl-2" style={{ borderColor: '#ffc107' }}>
                  <div className="font-semibold text-yellow-900">Renderer-Specific:</div>
                  {rendererName === 'plain-text' && (
                    <div>
                      • Plain text: Show all enrichments inline with line-based highlighting
                    </div>
                  )}
                  {rendererName === 'remark-rehype' && (
                    <div>
                      • Structured view: Apply enrichments to parsed AST nodes, maintain tree
                      structure
                    </div>
                  )}
                  {rendererName?.startsWith('edit') && (
                    <div>• Editor mode: Show enrichments as decorations, allow editing</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
