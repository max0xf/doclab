# DocLab TODO - Remaining Implementation Tasks

## 🔴 HIGH PRIORITY - PoC Use Cases

### 1. Edit of Rendered File with Commit/PR Creation
**Status:** Complete ✅ (git workflow fully implemented)

**Completed:**
- [x] VirtualContent architecture foundation
- [x] User changes tracking (UserDraftChange model)
- [x] Diff generation for changes
- [x] Edit mode toggle UI (Edit button in FileViewerHeader)
- [x] Plain text editing for all file types
- [x] Save dialog with description prompt
- [x] Unsaved changes warning on cancel
- [x] Draft change → commit → git push flow
  - `views_draft_changes.py`: applies changes, commits via worktree, pushes to fork
  - `worktree_manager.py`: `commit_changes_sync()`, `push_branch_sync()` — real git operations
- [x] Fork branch management (UserBranch model)
  - Branch creation from upstream/master (bare repo or local path)
  - Upstream remote setup for correct diff base
- [x] Create PR from committed branch
  - `views_user_branch.py create_pr()`: calls `bitbucket_server.create_pull_request()` (real API)
  - Stores PR ID/URL, updates branch status to PR_OPEN
  - Clears PR cache so new PR enrichment appears immediately
- [x] Rebase branch onto upstream
  - `views_user_branch.py rebase()`: real git rebase with conflict detection
  - Returns 409 with conflict files on rebase conflict
- [x] Unstage (soft reset to draft changes)
  - `views_user_branch.py unstage()`: soft reset + convert commits back to draft changes
- [x] Discard all changes (hard reset)
  - `views_user_branch.py discard()`: hard reset + force push to clean fork branch
- [x] SpaceWorkspaceBar UI — all actions wired:
  - Commit (with log feedback), Create PR, Rebase, Unstage, Discard
  - Real-time branch status (file count, draft count, conflict indicator)
  - Spinner and step logging with timeouts
- [x] Commit/PR enrichments in file viewer
  - `CommitEnrichmentProvider`: shows commit diff inline (ACTIVE branches only)
  - `PREnrichmentProvider`: shows PR diff inline (detected from Bitbucket)
  - Deduplication: commit enrichment hidden when PR already covers same branch
- [x] Conflict detection and display
  - VirtualContentBuilder detects line-level conflicts between PR/commit/edit diffs
  - Conflict lines highlighted with amber background
  - Single compact AlertTriangle badge (with count) per conflict block
  - Click opens ConflictDetailsDialog (shows winner vs blocked enrichment)

**Remaining:**
- [ ] Visual/WYSIWYG editor for Markdown
  - `MarkdownContentWidget.tsx` is a stub — renders raw text in `<textarea>` only
  - No TipTap, ProseMirror, or any rich text library integrated
  - Need: Real markdown WYSIWYG editor
- [ ] Conflict resolution actions
  - `ConflictDetailsDialog.tsx` shows conflicts but has no "choose this version" button
  - `ConflictResolutionWidget.tsx` has choose buttons but is dead code (never rendered)
  - Need: Wire up resolution choice → update draft change / apply winning enrichment
- [ ] Connect old approve/reject buttons
  - `views_user_changes.py approve()/reject()`: updates DB status only, no git operation
  - `commit_batch()`: has `# TODO: Implement Git commit logic` comment, marks committed in DB only
  - These are legacy — new system uses UserDraftChange → UserBranch → commit instead
  - Either remove or connect to new flow

---

### 2. Embedded Comments and Diffs from Active PRs
**Status:** Complete ✅

**Completed:**
- [x] PR diff enrichment provider (fetches all open PRs, filters by file)
- [x] Inline PR diff rendering with virtual content layering
- [x] PR badges on changed lines (PR number, color-coded additions/deletions)
- [x] Multiple PR support (all open PRs shown simultaneously)
- [x] Diff hunks with additions/deletions visualization
- [x] PR metadata display (number, title, author, state, URL)
- [x] `from_branch` field on pr_diff enrichments (for commit deduplication)
- [x] Empty-diff cache invalidation (retries after PR creation)

---

### 3. Inline Comments (Line-Specific)
**Status:** Complete ✅

**Completed:**
- [x] Line-specific comment creation
- [x] Comment anchoring to lines
- [x] Comment badges with count
- [x] Threaded replies (unlimited depth)
- [x] Nested reply structure in API
- [x] Recursive rendering of replies
- [x] Delete/update/resolve operations on all comments
- [x] Comment panel with line grouping
- [x] Auto-expand selected line comments

---

### 4. Page/Document Comments
**Status:** Complete ✅

**Completed:**
- [x] Document-level comments (no line anchoring)
- [x] Collapsible document comments section
- [x] Threaded replies on document comments
- [x] Same CRUD operations as line comments
- [x] Separate UI section for document vs line comments

---

### 5. Custom Hierarchy for Repo with Human Readable Names
**Status:** Complete ✅

**Completed:**
- [x] Space-based organization
- [x] Custom space names and descriptions
- [x] Space slug for URL-friendly names
- [x] Space permissions and ownership
- [x] Favorites and recent spaces
- [x] Space shortcuts for quick navigation
- [x] Hierarchical navigation in left menu
- [x] FileMapping model with display_name, description, is_folder support
- [x] CRUD API endpoints for file mappings (views_file_mapping.py)
- [x] Name extraction from file content (first_h1, first_h2, title_frontmatter, filename)
- [x] Folder rules with inheritance (apply_folder_rule, parent_rule)
- [x] Bulk update mappings API
- [x] Tree with mappings API (get_tree endpoint)
- [x] Sync and refresh mappings APIs
- [x] Frontend FileMappingConfigPanel and FileMappingConfiguration components
- [x] Frontend fileMappingApi.ts service
- [x] FileTree and SpaceTree integration with display names
- [x] Breadcrumb with custom mapped names (MainView.tsx builds mapped breadcrumb path)

---

### 6. Preview/Edit for Markdown, Drawio, and Mermaid
**Status:** Not Implemented ❌

**Markdown:**
- [x] Code block syntax highlighting (in plain text mode)
- [x] Tables (in plain text mode — visible as raw syntax only)
- [x] Links (in plain text mode)
- [ ] Actual markdown rendering (visual mode)
  - `MarkdownContentWidget.tsx` is a stub — displays raw text in `<pre>` tags
  - `ViewMode.VISUAL` enum and tab exist in UI but render same plain text widget
  - Need: Integrate react-markdown or similar and connect to Visual tab
- [ ] Enrichments (comments, PR diffs) in rendered markdown view
  - Currently enrichments only work in plain text mode
- [ ] Visual/WYSIWYG editor for markdown
  - Need: Rich text editor (TipTap, ProseMirror)
- [ ] Live preview mode (edit and preview side-by-side)

**Drawio:**
- [ ] Drawio file detection (.drawio, .drawio.xml)
- [ ] Plain text edit mode for .drawio XML
- [ ] Visual preview of diagrams
- [ ] Future: Visual editor integration

**Mermaid:**
- [ ] Mermaid diagram detection in markdown (```mermaid blocks)
- [ ] Mermaid rendering (mermaid.js library)
- [ ] Live diagram preview while editing

**Code Files (YAML, XML, JSON, etc.):**
- [x] Syntax highlighting for common formats
- [x] Plain text viewing
- [x] Line numbers
- [ ] Code folding support
- [ ] Schema validation (YAML, JSON)

---

### 7. Integration with Jira
**Status:** Frontend placeholder only ❌

- [x] JIRA service token type defined in frontend UI (Configuration/index.tsx)
- [ ] Backend JIRA provider (zero implementation — no `jira.py` provider file)
- [ ] Jira issue link detection in markdown
- [ ] Issue status/assignee/priority fetching from Jira API
- [ ] Rich link rendering with status badges
- [ ] Caching of Jira data

---

### 8. Commits/PR - Bitbucket Integration
**Status:** Complete for PoC ✅ (API commit creation intentionally not needed)

**Bitbucket Server (Completed):**
- [x] Repository listing (with project hierarchy)
- [x] Branch listing, creation, deletion
- [x] File content retrieval
- [x] Directory listing (with nested path handling)
- [x] PR diff fetching (with pagination support)
- [x] PR files listing
- [x] Authentication with tokens and custom headers
- [x] Response caching for authenticated users (APIResponseCache)
- [x] Commit history retrieval
- [x] PR creation (`create_pull_request()` — real POST to Bitbucket API)
- [x] PR status check (`get_pull_request_status()`)
- [x] `from_branch` field in normalized PR data (used for commit deduplication)

**Notes:**
- `create_commit()` raises NotImplementedError intentionally — commits are created via
  git worktree (subprocess git commands), not via the Bitbucket Files API

**Remaining (nice-to-have):**
- [ ] PR update/merge operations via API
- [ ] Comment posting to Bitbucket PRs

**GitHub (Future):**
- [ ] GitHub provider implementation
- [ ] OAuth authentication
- [ ] Repository/PR operations

---

## 🟡 MEDIUM PRIORITY - Enhancements

### Full-Text Search
**Status:** Not Implemented ❌

- No search endpoint in backend (zero references)
- No search UI in frontend
- Need: Index file content, expose `/api/search/` endpoint, add search UI

### Guest Commenter System
**Status:** Role exists, no special features ⚠️

- [x] Guest role defined in types and user model
- [ ] Token-based anonymous commenting (no account required)
- [ ] Public share links for guest access
- Currently guest is just a permission level, not a special commenter flow

---

## 🟢 LOW PRIORITY - Optional Features

### 9. SSO/OIDC Authentication
**Status:** Stub — returns 501 Not Implemented

- [x] SSO endpoint stubs created (`auth_views.py`)
- [ ] `sso_login_view()`: generates OIDC authorization URL (currently 501)
- [ ] `sso_callback_view()`: exchanges code for tokens, creates user (currently 501)
- [ ] OIDC environment config (client ID, secret, discovery URL)
- [ ] Frontend "Login with SSO" button and redirect flow

---

## 🔵 ENHANCEMENTS - Nice to Have

**Keyboard Shortcuts:**
- [ ] Cmd+E - Toggle edit mode
- [ ] Cmd+S - Save changes
- [ ] Cmd+/ - Toggle comments panel
- [ ] Cmd+F - Search in file

**Collaboration:**
- [ ] Real-time updates (WebSocket)
- [ ] Show who's viewing/editing
- [ ] Conflict resolution: user choice of winner (not just auto-layering)

**Diff Enhancements:**
- [ ] Word-level diff highlighting
- [ ] Syntax highlighting in diff hunks
- [ ] Diff statistics visualization

**Comment Enhancements:**
- [ ] Rich text comments (markdown)
- [ ] @mentions
- [ ] Comment reactions

---

## 📋 TECHNICAL DEBT

### Legacy Code
- [ ] Remove or connect old `UserChange` approve/reject/commit_batch flow
  - `views_user_changes.py`: DB-only status changes, never commits to git
  - New system: UserDraftChange → UserBranch → git commit (views_draft_changes.py)
  - The old DiffViewer Accept/Reject buttons log to console only

### Data Model
- [ ] Migrate User model to UUID primary key
  - Currently using Django default integer IDs; all other models use UUIDs

### Code Quality
- [ ] Remove console.log statements from production code
- [ ] Add error boundaries in React components
- [ ] Type all `any` usages in enrichment data paths

### Performance
- [ ] Virtual scrolling for large files
- [ ] Pagination for large diff hunks
- [ ] Optimize re-renders in file viewer on enrichment updates

### Security
- [ ] CSRF protection for state-changing operations
- [ ] Rate limiting on API endpoints
- [ ] Input validation / markdown sanitization

---

## 🧪 TESTING GAPS

### Backend
- [ ] Integration tests for git commit/push/rebase flow
- [ ] UserBranch status transitions (ACTIVE → PR_OPEN → ABANDONED)
- [ ] Conflict detection in VirtualContentBuilder edge cases
- [ ] Large file handling
- [ ] Concurrent edit detection

### Frontend
- [ ] Component unit tests for SpaceWorkspaceBar
- [ ] VirtualContentBuilder conflict detection unit tests
- [ ] E2E tests for commit/PR creation flow
- [ ] Accessibility tests

---

## 📚 DOCUMENTATION

- [ ] Architecture overview (enrichment system, virtual content layering)
- [ ] Git workflow documentation (UserDraftChange → UserBranch → PR)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment guide
- [ ] Enrichment provider development guide
