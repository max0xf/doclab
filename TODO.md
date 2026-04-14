# DocLab TODO - Remaining Implementation Tasks

## 🔴 HIGH PRIORITY - PoC Use Cases

### 1. Edit of Rendered File with Commit/PR Creation
**Status:** Partial - Basic edit exists, not fully tested or supported

**Completed:**
- [x] VirtualContent architecture foundation
- [x] User changes tracking (pending changes stored)
- [x] Diff generation for changes

**Remaining:**
- [ ] Edit mode completion
  - Plain text editing works but not tested thoroughly
  - Visual/rendered mode editing not supported
  - Need: Edit mode for all file types (Markdown, YAML, XML, etc.)
  - Need: Visual editor for Markdown (WYSIWYG)
  - Need: Comprehensive testing of edit functionality
- [ ] Edit mode toggle UI
  - Add Edit/Preview toggle button
  - Handle unsaved changes warnings
  - Auto-save or save prompt
- [ ] Git commit creation from approved changes
  - File: `src/backend/src/wiki/views_user_changes.py:104`
  - Need: Implement actual Git commit via provider
- [ ] PR creation workflow
  - Backend: Add `create_pr` action to UserChangeViewSet
  - Frontend: Add "Create PR" button in diff view
  - Integration: Call git provider's PR creation API
- [ ] Approve/reject workflow completion
  - Backend: Implement approve/reject actions
  - Frontend: Connect approve/reject buttons to API

---

### 2. Embedded Comments and Diffs from Active PRs
**Status:** Complete ✅

**Completed:**
- [x] PR diff enrichment provider
- [x] Inline PR diff rendering with virtual content
- [x] PR badges on changed lines
- [x] Multiple PR support with filtering
- [x] Diff hunks with additions/deletions visualization
- [x] PR metadata display (number, title, author, state)

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
**Status:** Partial - Space organization done, file mapping missing

**Completed:**
- [x] Space-based organization
- [x] Custom space names and descriptions
- [x] Space slug for URL-friendly names
- [x] Space permissions and ownership
- [x] Favorites and recent spaces
- [x] Space shortcuts for quick navigation
- [x] Hierarchical navigation in left menu

**Remaining:**
- [ ] File path to human-readable name mapping
  - Backend: Add FileMapping model (file_path → display_name, description)
  - API: CRUD endpoints for file mappings
  - UI: Show mapped names instead of raw file paths
  - Example: `docs/api/rest.md` → "REST API Documentation"
- [ ] Directory/folder custom names
  - Map entire directories to readable names
  - Example: `src/backend/` → "Backend Services"
- [ ] Breadcrumb navigation with custom names
  - Show mapped names in breadcrumbs
  - Fallback to file path if no mapping exists
- [ ] File mapping management UI
  - Bulk import from CSV/JSON
  - Inline editing in file browser
  - Search and filter mappings

---

### 6. Preview/Edit for Markdown, Drawio, and Mermaid
**Status:** Minimal - Only plain text view, no visual editing or enrichments

**Markdown:**
- [x] Basic markdown rendering (react-markdown)
- [ ] Enrichments in rendered markdown view
  - Comments and diffs don't show in rendered markdown
  - Only work in plain text view
- [ ] Visual/WYSIWYG editor for markdown
  - Currently only plain text editing
  - Need: Rich text editor (e.g., TipTap, ProseMirror)
- [ ] Live preview mode
  - Edit and preview side-by-side
- [ ] Advanced markdown features
  - [ ] Task lists (checkboxes)
  - [ ] Footnotes
  - [ ] Definition lists
  - [x] Code block syntax highlighting
  - [x] Tables
  - [x] Links

**Drawio:**
- [ ] Drawio file detection (.drawio, .drawio.xml)
- [ ] Plain text edit mode for .drawio XML
- [ ] Syntax highlighting for XML
- [ ] Visual preview of diagrams
  - Render drawio diagrams in view mode
- [ ] Future: Visual editor integration (drawio embed)

**Mermaid:**
- [ ] Mermaid diagram detection in markdown (```mermaid blocks)
- [ ] Mermaid rendering in preview
  - Use mermaid.js library
- [ ] Plain text edit for mermaid blocks
- [ ] Live diagram preview while editing
- [ ] Support for all mermaid diagram types
  - Flowcharts, sequence diagrams, class diagrams, etc.

**Code Files (YAML, XML, JSON, etc.):**
- [x] Syntax highlighting for common formats
- [x] Plain text viewing
- [x] Line numbers
- [ ] Code folding support (not implemented)
- [ ] Plain text editing (exists but not tested)
- [ ] Schema validation (YAML, JSON)
- [ ] Auto-formatting

---

### 7. Integration with Jira
**Status:** Not Started

**Requirements:**
- [ ] Jira issue link detection in markdown
- [ ] Jira API integration
  - Backend: Add Jira provider
  - Config: Jira URL, credentials, project keys
- [ ] Issue status display
  - Fetch issue metadata (status, assignee, priority)
  - Render as rich links with status badges
- [ ] Confluence-like rendering
  - Issue key → clickable link with tooltip
  - Status indicator (To Do, In Progress, Done)
  - Assignee avatar/name
- [ ] Caching of Jira data
  - Cache issue metadata to reduce API calls
  - Refresh on demand or periodic sync

---

### 8. Commits/PR - Bitbucket Integration
**Status:** Partial - Read operations complete, write operations pending

**Bitbucket Server (Completed):**
- [x] Repository listing
- [x] Branch listing
- [x] File content retrieval
- [x] Directory listing
- [x] PR diff fetching
- [x] Authentication with tokens

**Bitbucket Server (Remaining):**
- [ ] Commit creation
  - Implement `create_commit()` in BitbucketServerProvider
  - File: `src/backend/src/git_provider/providers/bitbucket_server.py:285`
- [ ] PR creation
  - Add `create_pull_request()` method
  - Support title, description, source/target branches
- [ ] PR update/merge operations
- [ ] Commit history retrieval

**GitHub (Future):**
- [ ] GitHub provider implementation
- [ ] OAuth authentication
- [ ] Repository operations
- [ ] Commit and PR creation
- [ ] GitHub Actions integration

---

## 🟡 MEDIUM PRIORITY - Enhancements

---

## 🟢 LOW PRIORITY - Optional Features

### 9. SSO/OIDC Authentication (6-8 hours)
**Status:** Stub - Returns 501

**Backend Tasks:**
- [ ] Implement `sso_login()` view
  - File: `src/backend/src/users/auth_views.py:136`
  - Use: Authlib OIDC client
  - Generate authorization URL
  - Redirect to SSO provider

- [ ] Implement `sso_callback()` view
  - File: `src/backend/src/users/auth_views.py:159`
  - Exchange authorization code for tokens
  - Validate ID token
  - Create/update user
  - Establish session

- [ ] Add SSO configuration
  - Environment variables for OIDC settings
  - Client ID, secret, discovery URL
  - Callback URL configuration

**Frontend Tasks:**
- [ ] Add "Login with SSO" button
- [ ] Handle SSO redirect flow
- [ ] Store SSO session

**Testing:**
- [ ] Test SSO login flow
- [ ] Test callback handling
- [ ] Test user creation/update
- [ ] Test token validation

---

## 🔵 ENHANCEMENTS - Nice to Have

### 4. Advanced Features (Optional)

**Keyboard Shortcuts:**
- [ ] Cmd+E - Toggle edit mode
- [ ] Cmd+S - Save changes
- [ ] Cmd+/ - Toggle comments panel
- [ ] Cmd+F - Search in file
- [ ] Cmd+G - Jump to line

**Search & Navigation:**
- [ ] Search within file
- [ ] Jump to line number
- [ ] Symbol navigation (functions, classes)
- [ ] Breadcrumb navigation

**Collaboration:**
- [ ] Real-time updates (WebSocket)
- [ ] Show who's viewing/editing
- [ ] Live cursor positions
- [ ] Conflict detection

**Diff Enhancements:**
- [ ] Syntax highlighting in diffs
- [ ] Word-level diff highlighting
- [ ] Ignore whitespace option
- [ ] Diff statistics visualization

**Comment Enhancements:**
- [ ] Rich text comments (markdown)
- [ ] @mentions with notifications
- [ ] Comment reactions (emoji)
- [ ] Comment search

---

## 📋 TECHNICAL DEBT

### Data Model
- [ ] Migrate User model to UUID primary key
  - Currently using Django's default User model with integer IDs
  - All other models (FileComment, Space, Document) use UUIDs
  - Would require custom User model and complex migration
  - Low priority - current setup works fine

### Code Quality
- [ ] Add JSDoc comments to all public functions
- [ ] Add Python docstrings to all public methods
- [ ] Remove console.log statements from production code
- [ ] Add error boundaries in React components

### Performance
- [ ] Implement virtual scrolling for large files
- [ ] Add pagination for large diff hunks
- [ ] Cache enrichment responses
- [ ] Optimize re-renders in CodeRenderer

### Security
- [ ] Add CSRF protection for state-changing operations
- [ ] Implement rate limiting on API endpoints
- [ ] Add input validation for all user inputs
- [ ] Sanitize markdown content

---

## 🧪 TESTING GAPS (See TESTING_TODO.md for details)

### Backend Integration Tests Needed
- [ ] User changes approve/reject workflow
- [ ] Enrichment filtering edge cases
- [ ] Git commit creation
- [ ] Large file handling
- [ ] Concurrent edit detection

### Frontend Tests Needed
- [ ] Component unit tests
- [ ] Integration tests with mock API
- [ ] E2E tests with Playwright
- [ ] Accessibility tests

---

## 📚 DOCUMENTATION

### User Documentation
- [ ] Getting started guide
- [ ] User manual for editing workflow
- [ ] Comment system guide
- [ ] Diff review guide

### Developer Documentation
- [ ] Architecture overview
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Enrichment provider development guide
- [ ] Deployment guide

### Code Documentation
- [ ] README for each major component
- [ ] Inline code comments
- [ ] Type definitions documentation
- [ ] Configuration examples

