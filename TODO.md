# DocLab TODO - Remaining Implementation Tasks

## 🔴 HIGH PRIORITY - Core Workflow Completion

### 1. Diff Approval Workflow (2-3 hours)
**Status:** Partial - UI ready, backend actions stubbed

**Backend Tasks:**
- [ ] Add `approve` action to `UserChangeViewSet`
  - File: `src/backend/src/wiki/views_user_changes.py`
  - Endpoint: `POST /api/wiki/v1/user-changes/{id}/approve/`
  - Logic: Set status to 'approved', record reviewer
  
- [ ] Add `reject` action to `UserChangeViewSet`
  - File: `src/backend/src/wiki/views_user_changes.py`
  - Endpoint: `POST /api/wiki/v1/user-changes/{id}/reject/`
  - Logic: Set status to 'rejected', record reviewer

- [ ] Implement Git commit logic in `commit_approved_changes()`
  - File: `src/backend/src/wiki/views_user_changes.py:104`
  - Current: Just marks as 'committed' without Git push
  - Needed: Actually commit to Git repository
  - Use: GitPython or provider's `create_commit()` method

**Frontend Tasks:**
- [ ] Connect `onAcceptDiff` to approve API
  - File: `src/frontend/components/MainView.tsx:582-586`
  - Replace TODO with actual API call
  
- [ ] Connect `onRejectDiff` to reject API
  - File: `src/frontend/components/MainView.tsx:587-591`
  - Replace TODO with actual API call

- [ ] Add error handling and success notifications
- [ ] Reload enrichments after approve/reject

**Testing:**
- [ ] Integration test for approve workflow
- [ ] Integration test for reject workflow
- [ ] Test Git commit creation

---

## 🟡 MEDIUM PRIORITY - Git Operations

### 2. Git Commit Creation (4-6 hours)
**Status:** Not Implemented

**GitHub Provider:**
- [ ] Implement `create_commit()` in `GitHubProvider`
  - File: `src/backend/src/git_provider/providers/github.py:165`
  - Use: GitHub Git Data API
  - Steps:
    1. Get current tree SHA
    2. Create blobs for changed files
    3. Create new tree
    4. Create commit
    5. Update branch reference

**Bitbucket Server Provider:**
- [ ] Implement `create_commit()` in `BitbucketServerProvider`
  - File: `src/backend/src/git_provider/providers/bitbucket_server.py:285`
  - Use: Bitbucket REST API
  - Alternative: Use GitPython for local operations

**Local Git Provider:**
- [ ] Enhance `create_commit()` in `LocalGitProvider`
  - File: `src/backend/src/git_provider/providers/local_git.py`
  - Already has basic implementation
  - May need enhancements for multi-file commits

**Testing:**
- [ ] Test commit creation for each provider
- [ ] Test multi-file commits
- [ ] Test commit message formatting
- [ ] Test branch updates

---

## 🟢 LOW PRIORITY - Optional Features

### 3. SSO/OIDC Authentication (6-8 hours)
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

---

## 🎯 PRIORITY ORDER FOR IMPLEMENTATION

1. **Week 1:** Diff approval workflow (HIGH)
   - Backend approve/reject endpoints
   - Frontend integration
   - Basic tests

2. **Week 2:** Git commit creation (MEDIUM)
   - GitHub provider implementation
   - Bitbucket provider implementation
   - Comprehensive tests

3. **Week 3:** Testing & Polish
   - Integration test coverage
   - Bug fixes
   - Performance optimization

4. **Week 4+:** Optional features (LOW)
   - SSO if needed
   - Advanced features based on user feedback

---

## 📊 COMPLETION METRICS

**Current Status:**
- Core Features: 90% complete
- Backend Tests: 100% (37/37 passing)
- Frontend Tests: 0% (not started)
- Documentation: 20% complete

**Target for v1.0:**
- Core Features: 100%
- Backend Tests: 100%
- Frontend Tests: 80%
- Documentation: 80%

---

## 🔗 RELATED FILES

- Implementation Plan: `/docs/implementation-plan-rendering-editing-enrichments.md`
- Backend Design: `/specs/docs/specs/backend/DESIGN.md`
- Test Structure: `/src/backend/src/integration_tests/TEST_STRUCTURE.md`
- Enrichment Tests: `/src/backend/src/integration_tests/README_ENRICHMENT_TESTS.md`
