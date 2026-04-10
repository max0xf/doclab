// =============================================================================
// URL / Route constants
// =============================================================================

export enum Urls {
  Dashboard = 'dashboard',
  Repositories = 'repositories',
  Spaces = 'spaces',
  DocumentEditor = 'doc',
  Search = 'search',
  ChangeHistory = 'history',
  PendingChanges = 'pending',
  JiraIntegration = 'jira',
  UserManagement = 'user-management',
  Profile = 'profile',
  Configuration = 'configuration',
}

// =============================================================================
// User / Auth
// =============================================================================

export enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Commenter = 'commenter',
  Viewer = 'viewer',
  Guest = 'guest',
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

export interface ApiToken {
  id: number;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
}

// =============================================================================
// Repositories
// =============================================================================

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  language?: string;
  updatedAt: string;
}

// =============================================================================
// Spaces
// =============================================================================

export interface Space {
  id: number;
  slug: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
}

// =============================================================================
// Documents
// =============================================================================

export enum DocumentType {
  Markdown = 'markdown',
  Code = 'code',
}

export interface Document {
  id: number;
  spaceId: number;
  title: string;
  path: string;
  content: string;
  type: DocumentType;
  gitPath: string;
  gitBranch: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Inline Comments
// =============================================================================

export enum CommentStatus {
  Open = 'open',
  Resolved = 'resolved',
  Outdated = 'outdated',
}

export interface InlineComment {
  id: number;
  documentId: number;
  lineStart: number;
  lineEnd: number;
  content: string;
  authorId: number;
  authorName: string;
  status: CommentStatus;
  replies: CommentReply[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReply {
  id: number;
  commentId: number;
  content: string;
  authorId: number;
  authorName: string;
  createdAt: string;
}

// =============================================================================
// Change History
// =============================================================================

export enum ChangeType {
  Create = 'create',
  Edit = 'edit',
  Delete = 'delete',
  Rename = 'rename',
  GitSync = 'git_sync',
}

export interface ChangeRecord {
  id: number;
  documentId: number;
  documentTitle: string;
  changeType: ChangeType;
  authorId: number;
  authorName: string;
  commitHash?: string;
  summary: string;
  diff?: string;
  createdAt: string;
}

// =============================================================================
// Pending Changes
// =============================================================================

export enum PendingChangeStatus {
  Draft = 'draft',
  Review = 'review',
  Approved = 'approved',
  Rejected = 'rejected',
}

export interface PendingChange {
  id: number;
  documentId: number;
  documentTitle: string;
  spaceId: number;
  spaceName: string;
  diff: string;
  status: PendingChangeStatus;
  authorId: number;
  authorName: string;
  reviewers: string[];
  description: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Git Sync
// =============================================================================

export enum SyncDirection {
  GitToWiki = 'git_to_wiki',
  WikiToGit = 'wiki_to_git',
  Bidirectional = 'bidirectional',
}

export enum SyncStatus {
  Synced = 'synced',
  Conflict = 'conflict',
  Pending = 'pending',
  Error = 'error',
}

export interface GitSyncConfig {
  id: number;
  spaceId: number;
  repoUrl: string;
  branch: string;
  basePath: string;
  direction: SyncDirection;
  status: SyncStatus;
  lastSyncAt?: string;
}

// =============================================================================
// JIRA
// =============================================================================

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  priority: string;
  url: string;
  labels: string[];
  updatedAt: string;
}

// =============================================================================
// Search
// =============================================================================

export interface SearchResult {
  documentId: number;
  documentTitle: string;
  spaceName: string;
  excerpt: string;
  lineNumber?: number;
  score: number;
}

// =============================================================================
// UI / Settings
// =============================================================================

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export interface UserSettings {
  theme: Theme;
  defaultSpaceId?: number;
}
