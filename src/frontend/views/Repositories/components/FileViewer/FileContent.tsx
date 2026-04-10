import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineRenderer } from './LineRenderer';
import { FileComment } from '../../../../services/commentsApi';

interface ChangeChunk {
  startLine: number;
  endLine: number;
  type: 'add' | 'delete';
}

interface FileContentProps {
  fileContent: string;
  fileComments: FileComment[];
  prDiffData: any;
  onLineClick: (lineNumber: number) => void;
}

export function FileContent({
  fileContent,
  fileComments,
  prDiffData,
  onLineClick,
}: FileContentProps) {
  const [changeChunks, setChangeChunks] = useState<ChangeChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const getLineChangeType = useCallback(
    (lineNumber: number): 'add' | 'delete' | null => {
      if (!prDiffData || !prDiffData.hunks) {
        return null;
      }
      for (const hunk of prDiffData.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add' && line.new_line_number === lineNumber) {
            return 'add';
          }
          if (line.type === 'delete' && line.old_line_number === lineNumber) {
            return 'delete';
          }
        }
      }
      return null;
    },
    [prDiffData]
  );

  // Detect change chunks when PR diff data changes
  useEffect(() => {
    if (!prDiffData || !prDiffData.hunks) {
      setChangeChunks([]);
      setCurrentChunkIndex(0);
      return;
    }

    const chunks: ChangeChunk[] = [];
    const lines = fileContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const changeType = getLineChangeType(lineNumber);

      if (changeType) {
        const prevChangeType = i > 0 ? getLineChangeType(i) : null;
        const isFirstLineOfBlock = changeType !== prevChangeType;

        if (isFirstLineOfBlock) {
          // Find the end of this chunk
          let endLine = lineNumber;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLineType = getLineChangeType(j + 1);
            if (nextLineType === changeType) {
              endLine = j + 1;
            } else {
              break;
            }
          }
          chunks.push({ startLine: lineNumber, endLine, type: changeType });
        }
      }
    }

    setChangeChunks(chunks);
    setCurrentChunkIndex(0);
  }, [prDiffData, fileContent, getLineChangeType]);

  const navigateToChunk = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'prev'
        ? Math.max(0, currentChunkIndex - 1)
        : Math.min(changeChunks.length - 1, currentChunkIndex + 1);

    setCurrentChunkIndex(newIndex);

    // Scroll to the chunk
    const chunk = changeChunks[newIndex];
    if (chunk && contentRef.current) {
      const lineElement = contentRef.current.querySelector(
        `[data-line-number="${chunk.startLine}"]`
      );
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto" ref={contentRef}>
      <div className="p-6">
        <div
          className="rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            maxWidth: '100%',
          }}
        >
          {(() => {
            let originalLineNumber = 0;
            return fileContent.split('\n').map((line, index) => {
              const lineNumber = index + 1;
              const lineComments = fileComments.filter(c => c.computed_line_number === lineNumber);
              const hasComments = lineComments.length > 0;
              const changeType = getLineChangeType(lineNumber);

              // Calculate original line number (before PR changes)
              if (changeType !== 'add') {
                originalLineNumber++;
              }

              // Check if this is the first line of a new PR change block
              const prevLineChangeType = index > 0 ? getLineChangeType(index) : null;
              const isFirstLineOfBlock = !!(changeType && changeType !== prevLineChangeType);

              const displayOldLine = changeType === 'add' ? null : originalLineNumber;
              const displayNewLine = changeType === 'delete' ? null : lineNumber;

              // Find if this line is the start of a chunk
              const chunkIndex = changeChunks.findIndex(chunk => chunk.startLine === lineNumber);
              const isChunkStart = chunkIndex !== -1;

              return (
                <LineRenderer
                  key={index}
                  lineNumber={lineNumber}
                  lineContent={line}
                  displayOldLine={displayOldLine}
                  displayNewLine={displayNewLine}
                  changeType={changeType}
                  hasComments={hasComments}
                  lineComments={lineComments}
                  isFirstLineOfBlock={isFirstLineOfBlock}
                  prNumber={prDiffData?.pr?.number}
                  prTitle={prDiffData?.pr?.title}
                  isChunkStart={isChunkStart}
                  chunkIndex={chunkIndex}
                  totalChunks={changeChunks.length}
                  onChunkNavigate={navigateToChunk}
                  onClick={() => onLineClick(lineNumber)}
                />
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
