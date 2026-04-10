export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified?: string;
}

export interface Repository {
  id: string;
  fullName: string;
  name: string;
  description?: string;
  defaultBranch: string;
  isPrivate: boolean;
  url: string;
}

export interface PRInfo {
  pr: any;
  file: any;
}
