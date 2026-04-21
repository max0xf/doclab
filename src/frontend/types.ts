// =============================================================================
// URL / Route constants
// =============================================================================

export enum Urls {
  Dashboard = 'dashboard',
  Spaces = 'spaces',
  SpaceConfiguration = 'space-configuration',
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
  id: string; // UUID
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
// Spaces (v2 - Confluence-like Architecture)
// =============================================================================

export enum SpaceVisibility {
  Private = 'private',
  Team = 'team',
  Public = 'public',
}

export enum SpacePermissionRole {
  Viewer = 'viewer',
  Editor = 'editor',
  Admin = 'admin',
}

export enum GitProvider {
  GitHub = 'github',
  BitbucketServer = 'bitbucket_server',
  LocalGit = 'local_git',
}

export interface Space {
  id: string; // UUID
  slug: string;
  name: string;
  description: string;

  // Ownership
  owner: number; // Django User ID (still integer)
  owner_username: string;
  created_by: number | null; // Django User ID (still integer)
  created_by_username: string | null;

  // Visibility
  visibility: SpaceVisibility;
  is_public: boolean; // Legacy field

  // Git Integration
  git_provider: GitProvider | null;
  git_base_url: string | null;
  git_project_key: string | null;
  git_repository_id: string | null;
  git_repository_name: string | null;
  git_default_branch: string;

  // Edit Fork Configuration
  edit_fork_project_key: string | null;
  edit_fork_repo_slug: string | null;
  edit_fork_ssh_url: string | null;
  edit_fork_local_path: string | null;
  edit_enabled: boolean;

  // File Mapping Configuration
  filters: string[];
  default_display_name_source: string;

  // Metadata
  page_count: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface SpacePermission {
  id: string; // UUID
  space: string; // UUID
  spaceName: string;
  user: number;
  userUsername: string;
  userEmail: string;
  role: SpacePermissionRole;
  grantedBy: number | null;
  grantedByUsername: string | null;
  createdAt: string;
}

export interface SpaceConfiguration {
  id: string; // UUID
  space: string; // UUID
  spaceSlug: string;
  spaceName: string;

  // Configuration objects
  fileTreeConfig: {
    rootPath?: string;
    fileExtensions?: string[];
    ignorePatterns?: string[];
    titleFromFrontmatter?: boolean;
    titleField?: string;
  };

  pageDisplayConfig: {
    showBreadcrumbs?: boolean;
    showToc?: boolean;
    showLastUpdated?: boolean;
    defaultViewMode?: 'document' | 'code';
  };

  syncConfig: {
    autoSync?: boolean;
    syncIntervalMinutes?: number;
    syncOnWebhook?: boolean;
    conflictResolution?: 'git_wins' | 'wiki_wins' | 'manual';
  };

  customSettings: Record<string, any>;
  updatedAt: string;
}

export interface SpaceShortcut {
  id: string; // UUID
  space: string; // UUID
  spaceSlug: string;
  pageId: number;
  label: string;
  order: number;
  createdBy: number;
  createdByUsername: string;
  createdAt: string;
}

export interface UserSpacePreference {
  id: string; // UUID
  user: number; // Django User ID
  user_username: string;
  space: string; // UUID
  space_slug: string;
  space_name: string;
  is_favorite: boolean;
  last_visited_at: string;
  visit_count: number;
  last_viewed_page_id: number | null;
}

export interface SpaceAttribute {
  id: string; // UUID
  space: string; // UUID
  spaceSlug: string;
  fieldId: string;
  fieldName: string;
  fieldValueStr: string | null;
  fieldValueInt: number | null;
  fieldValueFloat: number | null;
  value: string | number | null; // Computed field
  collectedAt: string;
  dataSource: string;
  version: number;
}

// Legacy Space interface (for backward compatibility)
export interface SpaceLegacy {
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
