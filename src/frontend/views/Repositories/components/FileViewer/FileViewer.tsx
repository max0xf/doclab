import React from 'react';
import { FileViewerHeader } from './FileViewerHeader';
import { FileContent } from './FileContent';
import { FileItem } from '../types';
import { FileComment } from '../../../../services/commentsApi';

interface FileViewerProps {
  repository: {
    id: string;
    fullName: string;
  };
  file: FileItem;
  fileContent: string;
  fileComments: FileComment[];
  allPRDiffs: any[];
  currentPRIndex: number;
  prDiffData: any;
  showComments: boolean;
  onBack: () => void;
  onToggleComments: () => void;
  onPRChange: (index: number, prDiffData: any) => void;
  onLineClick: (lineNumber: number) => void;
}

export function FileViewer({
  repository,
  file,
  fileContent,
  fileComments,
  allPRDiffs,
  currentPRIndex,
  prDiffData,
  showComments,
  onBack,
  onToggleComments,
  onPRChange,
  onLineClick,
}: FileViewerProps) {
  const handlePRChange = (index: number) => {
    onPRChange(index, allPRDiffs[index]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FileViewerHeader
        repositoryFullName={repository.fullName}
        fileName={file.name}
        fileSize={file.size}
        showComments={showComments}
        allPRDiffs={allPRDiffs}
        currentPRIndex={currentPRIndex}
        onBack={onBack}
        onToggleComments={onToggleComments}
        onPRChange={handlePRChange}
        repository={repository}
        file={file}
        fileContent={fileContent}
        prDiffData={prDiffData}
        fileComments={fileComments}
      />
      <FileContent
        fileContent={fileContent}
        fileComments={fileComments}
        prDiffData={prDiffData}
        onLineClick={onLineClick}
      />
    </div>
  );
}
