# Edit Workflow Design Document

## Document Information

| Field | Value |
|-------|-------|
| **Status** | Updated |
| **Author** | DocLab Team |
| **Created** | 2026-04-20 |
| **Last Updated** | 2026-04-20 |

---

## 1. Executive Summary

This document describes the architecture for enabling users to edit files in DocLab and create Pull Requests (PRs), without requiring users to have direct git access or SSH keys.

### Key Design Decision

We implement **Option 5: Bare Repository with Git Worktrees** because it provides:
- **Zero user setup** - users just edit and click submit
- **Fast performance** - worktrees are instant after initial cache
- **Secure isolation** - each edit session gets its own worktree
- **Proper attribution** - commits show actual user as author
- **Scalable** - one cached repo per space, regardless of user count

---

## 2. Problem Statement

### Current Limitations

1. **Bitbucket Server API has file editing disabled** - cannot create commits via REST API
2. **Users don't have git/SSH access** - cannot push directly
3. **Users can only create PRs via Bitbucket UI** - no programmatic PR creation from edits

### Goals

1. Users can edit files in DocLab browser UI
2. Users can submit edits as a PR with one click
3. Commits are attributed to the actual user (not a bot)
4. No git knowledge or setup required from users
5. Secure - users cannot access other users' changes or bypass permissions

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HIGH-LEVEL ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────────┐    │
│  │              │     │                  │     │                      │    │
│  │    USERS     │────▶│  DOCLAB SERVER   │────▶│   BITBUCKET SERVER   │    │
│  │  (Browser)   │     │                  │     │                      │    │
│  │              │     │  ┌────────────┐  │     │  ┌────────────────┐  │    │
│  └──────────────┘     │  │ Edit       │  │     │  │ Main Repo      │  │    │
│                       │  │ Sessions   │  │     │  │ (REAL/repo)    │  │    │
│                       │  │ (Database) │  │     │  └────────────────┘  │    │
│                       │  └────────────┘  │     │          ▲           │    │
│                       │                  │     │          │ PR        │    │
│                       │  ┌────────────┐  │     │          │           │    │
│                       │  │ Git Cache  │  │     │  ┌────────────────┐  │    │
│                       │  │ (Bare Repo)│──┼────▶│  │ Edit Fork      │  │    │
│                       │  └────────────┘  │push │  │ (~service/repo)│  │    │
│                       │                  │     │  └────────────────┘  │    │
│                       └──────────────────┘     └──────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Edit Session** | Database record tracking user's pending changes |
| **Git Cache** | Bare repository cached on server for fast operations |
| **Worktree** | Temporary working directory for applying changes |
| **Edit Fork** | Fork of main repo where branches are pushed |
| **Service Account** | Bitbucket account with SSH key for git operations |

---

## 4. Roles and Responsibilities

### 4.1 System Administrator

**Who**: DevOps/IT team member with server access

**One-time setup tasks**:

1. **Generate SSH key for DocLab server**
   ```bash
   ssh-keygen -t ed25519 -f /etc/doclab/git-ssh-key -N "" -C "doclab-server"
   ```

2. **Create service account in Bitbucket**
   - Username: `doclab-service` (or similar)
   - Email: `doclab-service@company.com`
   - Add SSH public key to this account

3. **Configure DocLab environment**
   ```bash
   # Required environment variables
   DOCLAB_GIT_SSH_KEY=/etc/doclab/git-ssh-key
   DOCLAB_GIT_CACHE_DIR=/data/doclab/git-cache
   DOCLAB_GIT_WORKTREE_DIR=/tmp/doclab-worktrees
   
   # Optional: Service account for API operations
   DOCLAB_SERVICE_BITBUCKET_USERNAME=doclab-service
   DOCLAB_SERVICE_BITBUCKET_TOKEN=<http-access-token>
   ```

4. **Ensure directories exist with proper permissions**
   ```bash
   mkdir -p /data/doclab/git-cache
   mkdir -p /tmp/doclab-worktrees
   chown doclab:doclab /data/doclab/git-cache
   chmod 700 /data/doclab/git-cache
   ```

### 4.2 Space Administrator

**Who**: Team lead or documentation owner who manages a DocLab space

**Per-space setup tasks**:

1. **Create edit fork in Bitbucket**
   - Navigate to main repository (e.g., `REAL/cyber-repo`)
   - Click "Fork"
   - Fork to service account's personal project: `~doclab-service/cyber-repo`
   - Or fork to own project and grant service account write access

2. **Configure space in DocLab**
   - Go to Space Settings → Edit Configuration
   - Set:
     - Edit Fork Project Key: `~doclab-service`
     - Edit Fork Repo Slug: `cyber-repo`
     - Edit Fork SSH URL: `ssh://git@git.example.com/~doclab-service/cyber-repo.git`

3. **Verify fork relationship**
   - Ensure PRs can be created from fork to main repo
   - Test by creating a manual PR if needed

### 4.3 Users (Editors)

**Who**: Anyone with Editor role in a DocLab space

**Requirements**: **NONE**

Users do not need:
- ❌ Git installed locally
- ❌ SSH keys
- ❌ Bitbucket write access
- ❌ Fork of the repository
- ❌ Any technical setup

Users only need:
- ✅ DocLab account with Editor permission on the space
- ✅ Read access to the main repository in Bitbucket (for viewing)

---

## 5. Edit Enrichment Model (Current Implementation)

The edit workflow is implemented using the **enrichment system**. User edits are represented as enrichments, which provides:
- Consistent rendering with PR diffs (same diff hunk format)
- Unified UI for viewing changes (highlighting, badges)
- Actions directly on enrichments (commit, discard, create PR)

### 5.1 Enrichment Types

| Type | Description | Storage | Actions |
|------|-------------|---------|---------|
| **`edit`** | User's edits | `UserDraftChange` model | `commit`, `discard` |
| **`commit`** | Commits in fork branch not in main | Git (via `UserBranch`) | `unstage`, `create_pr` |

### 5.2 Edit Flow via Enrichments

```
User edits file → Save → UserDraftChange → edit enrichment
                                              ↓ commit action
                              Git commit → UserBranch → commit enrichment
                                              ↓ create_pr action
                                          PR created → pr_diff enrichment
```

### 5.3 UserDraftChange Model

```python
class UserDraftChange(models.Model):
    """
    User edit - saved in DocLab but not yet committed to git.
    Shown as 'edit' enrichment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    space = models.ForeignKey(Space, on_delete=models.CASCADE)
    
    file_path = models.CharField(max_length=500)
    change_type = models.CharField(choices=['modify', 'create', 'delete'])
    
    original_content = models.TextField(blank=True)
    modified_content = models.TextField(blank=True)
    description = models.CharField(max_length=500, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['user', 'space', 'file_path']]
```

### 5.4 UserBranch Model

```python
class UserBranch(models.Model):
    """
    Tracks user's edit branch in the fork.
    Staged changes are commits in this branch.
    Shown as 'commit' enrichment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    space = models.ForeignKey(Space, on_delete=models.CASCADE)
    
    branch_name = models.CharField(max_length=200)
    base_branch = models.CharField(max_length=100, default='master')
    last_commit_sha = models.CharField(max_length=40, null=True)
    
    # PR info (set when PR is created)
    pr_id = models.IntegerField(null=True)
    pr_url = models.URLField(max_length=500, null=True)
    
    class Status(models.TextChoices):
        ACTIVE = 'active'      # Has staged changes, no PR yet
        PR_OPEN = 'pr_open'    # PR created
        PR_MERGED = 'pr_merged'
        PR_CLOSED = 'pr_closed'
        ABANDONED = 'abandoned'
    
    status = models.CharField(max_length=20, choices=Status.choices)
    
    class Meta:
        unique_together = [['user', 'space', 'branch_name']]
```

### 5.5 Enrichment Providers

**EditEnrichmentProvider** - Returns `edit` enrichments:
- Queries `UserDraftChange` for the current user and file
- Generates `diff_hunks` from original/modified content
- Returns actions: `['commit', 'discard']`

**CommitEnrichmentProvider** - Returns `commit` enrichments:
- Queries `UserBranch` for active branches
- Gets diff from git (branch vs base)
- Returns actions: `['unstage', 'create_pr']` or `['view_pr']` if PR exists

### 5.6 Commit Action Implementation

The `commit` action on `edit` enrichments:

1. **Get/Create UserBranch** - Creates unique branch per user/space
2. **Create Worktree** - Uses `GitWorktreeManager` to create isolated workspace
3. **Apply Changes** - Writes modified content to files in worktree
4. **Commit** - Creates git commit with user as author
5. **Push** - Pushes branch to edit fork
6. **Cleanup** - Deletes `UserDraftChange` records (now in git)

```
POST /api/wiki/v1/draft-changes/commit/
{
  "change_ids": ["uuid1", "uuid2"],
  "commit_message": "Optional message"
}

Response:
{
  "success": true,
  "commit_sha": "abc123...",
  "branch_name": "doclab/username/edit-xyz",
  "files_committed": 2
}
```

### 5.6 Enrichment Response Format

```json
{
  "edit": [{
    "type": "edit",
    "id": "uuid",
    "space_id": "uuid",
    "space_slug": "my-space",
    "file_path": "docs/README.md",
    "change_type": "modify",
    "user": "john.doe",
    "user_full_name": "John Doe",
    "diff_hunks": [
      {
        "old_start": 10,
        "old_count": 3,
        "new_start": 10,
        "new_count": 5,
        "lines": [" context", "-removed", "+added", "+added2", " context"]
      }
    ],
    "actions": ["commit", "discard"]
  }],
  "commit": [{
    "type": "commit",
    "id": "uuid",
    "space_id": "uuid",
    "branch_name": "doclab/john-doe/edit-abc123",
    "commit_sha": "abc123...",
    "diff_hunks": [...],
    "actions": ["unstage", "create_pr"]
  }]
}
```

### 5.7 UI Rendering

Both `edit` and `commit` enrichments are rendered the same way:
- **Line highlighting**: Amber/orange background for changed lines
- **Badge**: "Your change" badge on first line of each change group
- **No green dots**: Unlike other enrichments, edit changes don't show indicator dots
- **Diff hunks**: Same format as `pr_diff` for consistent rendering

---

## 6. Legacy Data Model (EditSession)

> **Note**: The `EditSession` model is kept for backward compatibility but the new
> enrichment-based workflow uses `UserDraftChange` and `UserBranch` instead.

### 6.1 Space Model Extensions

```python
class Space(models.Model):
    # ... existing fields ...
    
    # Edit Fork Configuration
    edit_fork_project_key = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Project key for edit fork (e.g., ~doclab-service)'
    )
    edit_fork_repo_slug = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text='Repository slug for edit fork'
    )
    edit_fork_ssh_url = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='SSH clone URL for edit fork'
    )
    
    @property
    def edit_enabled(self) -> bool:
        """Check if editing is configured for this space."""
        return bool(
            self.edit_fork_project_key and 
            self.edit_fork_repo_slug and 
            self.edit_fork_ssh_url
        )
```

### 6.2 EditSession Model (Legacy)

```python
class EditSession(models.Model):
    """
    Tracks a user's editing session for a space.
    Multiple file changes can be grouped into one session → one PR.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Ownership
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='edit_sessions')
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='edit_sessions')
    
    # Session state
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft - Changes pending'
        SUBMITTING = 'submitting', 'Submitting - PR being created'
        SUBMITTED = 'submitted', 'Submitted - PR created'
        MERGED = 'merged', 'Merged'
        CLOSED = 'closed', 'Closed without merge'
        ABANDONED = 'abandoned', 'Abandoned by user'
        ERROR = 'error', 'Error during submission'
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    error_message = models.TextField(blank=True)
    
    # Pending changes (JSON array)
    pending_changes = models.JSONField(default=list)
    # Structure:
    # [
    #     {
    #         "file_path": "docs/README.md",
    #         "original_content": "...",
    #         "modified_content": "...",
    #         "change_type": "modify",  # modify | create | delete
    #         "description": "Fixed typo in introduction"
    #     }
    # ]
    
    # Git info (populated after submission)
    branch_name = models.CharField(max_length=200, null=True, blank=True)
    base_branch = models.CharField(max_length=100, default='master')
    commit_sha = models.CharField(max_length=40, null=True, blank=True)
    
    # PR info (populated after PR creation)
    pr_id = models.IntegerField(null=True, blank=True)
    pr_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Metadata
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    def get_branch_name(self) -> str:
        """Generate unique branch name for this session."""
        if self.branch_name:
            return self.branch_name
        short_id = str(self.id)[:8]
        safe_username = self.user.username.lower().replace('.', '-')
        return f"doclab/{safe_username}/edit-{short_id}"
```

---

## 7. API Endpoints

### 7.1 Edit Session Management (Legacy)

```
# List user's edit sessions for a space
GET /api/wiki/v1/spaces/{space_id}/edit-sessions/
    Query params: ?status=draft|submitted|all

# Create new edit session
POST /api/wiki/v1/spaces/{space_id}/edit-sessions/
    Body: { "title": "Fix documentation typos", "base_branch": "master" }

# Get edit session details
GET /api/wiki/v1/edit-sessions/{session_id}/

# Update edit session metadata
PATCH /api/wiki/v1/edit-sessions/{session_id}/
    Body: { "title": "...", "description": "..." }

# Abandon/delete edit session
DELETE /api/wiki/v1/edit-sessions/{session_id}/
```

### 7.2 File Changes Within Session

```
# Add or update a file change
POST /api/wiki/v1/edit-sessions/{session_id}/changes/
    Body: {
        "file_path": "docs/README.md",
        "modified_content": "...",
        "change_type": "modify",
        "description": "Fixed typo"
    }

# Remove a file change from session
DELETE /api/wiki/v1/edit-sessions/{session_id}/changes/{file_path}/

# Get diff preview for all changes
GET /api/wiki/v1/edit-sessions/{session_id}/diff/
```

### 7.3 Submit Session (Create PR)

```
# Submit session - creates branch, commits, pushes, creates PR
POST /api/wiki/v1/edit-sessions/{session_id}/submit/
    Body: {
        "title": "PR Title (optional, defaults to session title)",
        "description": "PR Description (optional)"
    }
    
    Response: {
        "status": "submitted",
        "pr_id": 123,
        "pr_url": "https://git.example.com/projects/REAL/repos/cyber-repo/pull-requests/123",
        "branch_name": "doclab/maxim-cherey/edit-abc12345"
    }
```

### 7.4 PR Status Sync

```
# Manually refresh PR status from Bitbucket
POST /api/wiki/v1/edit-sessions/{session_id}/refresh-status/

# Webhook endpoint for Bitbucket PR events (optional)
POST /api/webhooks/bitbucket/pr-events/
```

---

## 8. Detailed Flows

### 8.1 User Edit Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER EDIT FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STEP 1: User Opens File                                                    │
│  ───────────────────────                                                    │
│  • User navigates to file in DocLab                                         │
│  • DocLab fetches content from Bitbucket (using user's read token)          │
│  • File displayed in viewer                                                 │
│                                                                             │
│  STEP 2: User Clicks "Edit"                                                 │
│  ──────────────────────────                                                 │
│  • Check: Does user have Editor permission? → If no, show error             │
│  • Check: Is space.edit_enabled? → If no, show "Editing not configured"     │
│  • Check: Does user have draft EditSession for this space?                  │
│    • If yes: Resume existing session                                        │
│    • If no: Create new EditSession with status=DRAFT                        │
│  • Switch to edit mode in UI                                                │
│                                                                             │
│  STEP 3: User Makes Changes                                                 │
│  ──────────────────────────                                                 │
│  • User edits content in browser                                            │
│  • On save/auto-save:                                                       │
│    • POST /edit-sessions/{id}/changes/ with modified content                │
│    • Server stores in EditSession.pending_changes                           │
│  • User can edit multiple files in same session                             │
│                                                                             │
│  STEP 4: User Reviews Changes                                               │
│  ───────────────────────────                                                │
│  • User clicks "Review Changes"                                             │
│  • GET /edit-sessions/{id}/diff/ returns unified diff                       │
│  • User sees all pending changes across files                               │
│                                                                             │
│  STEP 5: User Submits (Creates PR)                                          │
│  ─────────────────────────────────                                          │
│  • User enters PR title and description                                     │
│  • POST /edit-sessions/{id}/submit/                                         │
│  • Server performs git operations (see Section 7.2)                         │
│  • User sees success with PR link                                           │
│                                                                             │
│  STEP 6: PR Review (in Bitbucket)                                           │
│  ─────────────────────────────────                                          │
│  • User/reviewers review PR in Bitbucket UI                                 │
│  • Normal code review workflow                                              │
│  • Merge or decline                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Submit Flow (Server-Side)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUBMIT FLOW (SERVER-SIDE)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT: EditSession with pending_changes                                    │
│  OUTPUT: PR created, session updated                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. VALIDATE                                                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ • Session status must be DRAFT                                       │   │
│  │ • pending_changes must not be empty                                  │   │
│  │ • Space must have edit fork configured                               │   │
│  │ • User must still have Editor permission                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. UPDATE STATUS                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ • Set session.status = SUBMITTING                                    │   │
│  │ • Save to prevent duplicate submissions                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. ENSURE BARE REPO CACHE                                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ cache_path = /data/doclab/git-cache/spaces/{space_id}/edit-fork.git  │   │
│  │                                                                      │   │
│  │ IF cache does not exist:                                             │   │
│  │   git clone --bare --mirror {ssh_url} {cache_path}                   │   │
│  │ ELSE:                                                                │   │
│  │   git -C {cache_path} fetch --all --prune                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. CREATE WORKTREE                                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ branch_name = "doclab/{username}/edit-{session_id[:8]}"              │   │
│  │ worktree_path = /tmp/doclab-worktrees/{session_id}                   │   │
│  │                                                                      │   │
│  │ git -C {cache_path} worktree add \                                   │   │
│  │   -b {branch_name} \                                                 │   │
│  │   {worktree_path} \                                                  │   │
│  │   origin/{base_branch}                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. APPLY CHANGES                                                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ FOR each change in pending_changes:                                  │   │
│  │   file_path = worktree_path / change.file_path                       │   │
│  │                                                                      │   │
│  │   IF change.change_type == "delete":                                 │   │
│  │     os.remove(file_path)                                             │   │
│  │   ELIF change.change_type == "create":                               │   │
│  │     os.makedirs(dirname(file_path), exist_ok=True)                   │   │
│  │     write(file_path, change.modified_content)                        │   │
│  │   ELIF change.change_type == "modify":                               │   │
│  │     write(file_path, change.modified_content)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. COMMIT WITH USER ATTRIBUTION                                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ author = "{user.full_name} <{user.email}>"                           │   │
│  │                                                                      │   │
│  │ git -C {worktree_path} add -A                                        │   │
│  │ git -C {worktree_path} commit \                                      │   │
│  │   --author="{author}" \                                              │   │
│  │   -m "{session.title}" \                                             │   │
│  │   -m "{session.description}"                                         │   │
│  │                                                                      │   │
│  │ commit_sha = git rev-parse HEAD                                      │   │
│  │                                                                      │   │
│  │ NOTE: Commit shows:                                                  │   │
│  │   Author: Maxim Cherey <maxim.cherey@company.com>  ← Actual user     │   │
│  │   Committer: doclab-service <doclab@company.com>   ← Service account │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 7. PUSH BRANCH                                                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ git -C {worktree_path} push origin {branch_name}                     │   │
│  │                                                                      │   │
│  │ Uses SSH key: /etc/doclab/git-ssh-key                                │   │
│  │ Pushes to: ~doclab-service/cyber-repo (edit fork)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 8. CREATE PULL REQUEST (via Bitbucket API)                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ POST /rest/api/1.0/projects/REAL/repos/cyber-repo/pull-requests      │   │
│  │ {                                                                    │   │
│  │   "title": "{session.title}",                                        │   │
│  │   "description": "{session.description}",                            │   │
│  │   "fromRef": {                                                       │   │
│  │     "id": "refs/heads/{branch_name}",                                │   │
│  │     "repository": {                                                  │   │
│  │       "project": { "key": "~doclab-service" },                       │   │
│  │       "slug": "cyber-repo"                                           │   │
│  │     }                                                                │   │
│  │   },                                                                 │   │
│  │   "toRef": {                                                         │   │
│  │     "id": "refs/heads/{base_branch}",                                │   │
│  │     "repository": {                                                  │   │
│  │       "project": { "key": "REAL" },                                  │   │
│  │       "slug": "cyber-repo"                                           │   │
│  │     }                                                                │   │
│  │   }                                                                  │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 9. CLEANUP WORKTREE                                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ git -C {cache_path} worktree remove --force {worktree_path}          │   │
│  │                                                                      │   │
│  │ NOTE: Branch remains in bare repo (needed for PR)                    │   │
│  │ NOTE: Branch will be deleted after PR is merged/closed               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 10. UPDATE SESSION                                                   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ session.status = SUBMITTED                                           │   │
│  │ session.branch_name = branch_name                                    │   │
│  │ session.commit_sha = commit_sha                                      │   │
│  │ session.pr_id = pr_response.id                                       │   │
│  │ session.pr_url = pr_response.links.self                              │   │
│  │ session.submitted_at = now()                                         │   │
│  │ session.save()                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ERROR HANDLING:                                                            │
│  • If any step fails, set session.status = ERROR                            │
│  • Store error message in session.error_message                             │
│  • Cleanup worktree if it was created                                       │
│  • User can retry submission after fixing issues                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 PR Status Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PR STATUS SYNC FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OPTION A: Webhook (Recommended)                                            │
│  ────────────────────────────────                                           │
│  1. Configure Bitbucket webhook to POST to DocLab on PR events              │
│  2. DocLab receives: pr:merged, pr:declined, pr:deleted                     │
│  3. Update EditSession status accordingly                                   │
│  4. Optionally delete branch from edit fork                                 │
│                                                                             │
│  OPTION B: Polling                                                          │
│  ─────────────────                                                          │
│  1. Background job runs every N minutes                                     │
│  2. For each session with status=SUBMITTED:                                 │
│     GET /rest/api/1.0/.../pull-requests/{pr_id}                             │
│  3. Update session status based on PR state                                 │
│                                                                             │
│  OPTION C: Manual Refresh                                                   │
│  ─────────────────────────                                                  │
│  1. User clicks "Refresh Status" in DocLab                                  │
│  2. DocLab fetches PR status from Bitbucket                                 │
│  3. Updates session status                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

| Operation | Authentication | Authorization Check |
|-----------|---------------|---------------------|
| View file | User's Bitbucket token | Bitbucket repo read access |
| Create EditSession | DocLab JWT | User has Editor role in space |
| Add file change | DocLab JWT | User owns the session |
| Submit session | DocLab JWT | User owns the session |
| Git push | Service SSH key | N/A (service account) |
| Create PR | Service API token | Fork→Main PR permission |

### 9.2 Branch Naming Security

All branches follow strict naming convention:
```
doclab/{username}/edit-{session_uuid}
```

**Security benefits**:
- Users can only create branches in their namespace
- Branch name includes session UUID (unpredictable)
- Easy to audit and cleanup
- Cannot overwrite other users' branches

### 9.3 File Path Validation

Before applying changes, validate file paths:

```python
def validate_file_path(file_path: str, space: Space) -> bool:
    """Ensure file path is safe and within allowed scope."""
    
    # Prevent path traversal
    if '..' in file_path:
        return False
    
    # Must be relative path
    if file_path.startswith('/'):
        return False
    
    # Normalize and check
    normalized = os.path.normpath(file_path)
    if normalized.startswith('..'):
        return False
    
    # Optional: Check against space's allowed paths/filters
    if space.filters:
        # Validate against configured file patterns
        pass
    
    return True
```

### 9.4 Content Validation

```python
def validate_content(content: str, file_path: str) -> bool:
    """Validate file content before committing."""
    
    # Size limit (e.g., 10MB)
    if len(content.encode('utf-8')) > 10 * 1024 * 1024:
        return False
    
    # Must be valid UTF-8 text
    try:
        content.encode('utf-8')
    except UnicodeError:
        return False
    
    # Optional: File-type specific validation
    # e.g., validate Markdown syntax, check for sensitive data
    
    return True
```

### 9.5 Service Account Permissions

The service account should have **minimal permissions**:

| Permission | Required | Reason |
|------------|----------|--------|
| Create repos in own project | ✅ Yes | To hold forks |
| Push to own repos | ✅ Yes | To push branches |
| Create PRs from fork | ✅ Yes | To create PRs |
| Read main repos | ✅ Yes | To clone/fetch |
| Write to main repos | ❌ No | Not needed |
| Admin access | ❌ No | Not needed |
| Access other users' repos | ❌ No | Not needed |

### 9.6 Isolation Between Users

- Each EditSession is owned by one user
- Users cannot see or modify other users' sessions
- Worktrees are created in isolated temp directories
- Branch names include username for namespace isolation
- Database queries always filter by `user=request.user`

---

## 10. Storage & Performance

### 10.1 Disk Space Usage

```
/data/doclab/git-cache/
└── spaces/
    └── {space_uuid}/
        └── edit-fork.git/     # ~50-500MB per space (bare repo)

/tmp/doclab-worktrees/
└── {session_uuid}/            # ~10-100MB per active session
                               # Deleted after PR creation
```

**Estimates**:
- 10 spaces × 200MB average = 2GB for bare repos
- 20 concurrent sessions × 50MB = 1GB temp (peak)
- Total: ~3GB typical, ~10GB maximum

### 10.2 Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| First clone (bare) | 10-60s | One-time per space, depends on repo size |
| Fetch updates | 1-5s | Incremental, fast |
| Create worktree | <1s | Instant, no network |
| Apply changes | <1s | Local file writes |
| Commit | <1s | Local operation |
| Push | 1-5s | Network, depends on change size |
| Create PR (API) | 1-2s | API call |
| **Total submit time** | **3-10s** | After initial cache |

### 10.3 Concurrency

- Multiple users can submit simultaneously
- Each gets separate worktree (no conflicts)
- Bare repo supports concurrent worktrees
- File locking not required (different branches)

---

## 11. Error Handling

### 11.1 Error Categories

| Category | Example | Recovery |
|----------|---------|----------|
| **Validation** | Empty changes, invalid path | User fixes and retries |
| **Git** | Clone failed, push rejected | Admin checks SSH key/permissions |
| **API** | PR creation failed | Check service account permissions |
| **Conflict** | Base branch moved | User rebases or creates new session |
| **System** | Disk full, timeout | Admin intervention |

### 11.2 Error States

```python
class EditSession:
    class Status(models.TextChoices):
        DRAFT = 'draft'
        SUBMITTING = 'submitting'
        SUBMITTED = 'submitted'
        MERGED = 'merged'
        CLOSED = 'closed'
        ABANDONED = 'abandoned'
        ERROR = 'error'  # ← Error state
    
    error_message = models.TextField(blank=True)  # ← Error details
```

### 11.3 Retry Logic

```python
async def submit_with_retry(session: EditSession, max_retries: int = 3):
    """Submit with automatic retry for transient failures."""
    
    for attempt in range(max_retries):
        try:
            return await submit_edit_session(session)
        except TransientError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
        except PermanentError:
            raise  # Don't retry permanent failures
```

---

## 12. Configuration Reference

### 12.1 Environment Variables

```bash
# Required
DOCLAB_GIT_SSH_KEY=/etc/doclab/git-ssh-key
DOCLAB_GIT_CACHE_DIR=/data/doclab/git-cache
DOCLAB_GIT_WORKTREE_DIR=/tmp/doclab-worktrees

# Optional - Service account for API operations
DOCLAB_SERVICE_BITBUCKET_URL=https://git.example.com
DOCLAB_SERVICE_BITBUCKET_USERNAME=doclab-service
DOCLAB_SERVICE_BITBUCKET_TOKEN=<http-access-token>

# Optional - Tuning
DOCLAB_GIT_CLONE_TIMEOUT=300        # seconds
DOCLAB_GIT_PUSH_TIMEOUT=60          # seconds
DOCLAB_GIT_MAX_FILE_SIZE=10485760   # 10MB
DOCLAB_GIT_WORKTREE_TTL=3600        # cleanup abandoned worktrees after 1h
```

### 12.2 Space Configuration Fields

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `edit_fork_project_key` | string | Yes | `~doclab-service` |
| `edit_fork_repo_slug` | string | Yes | `cyber-repo` |
| `edit_fork_ssh_url` | string | Yes | `ssh://git@git.example.com/~doclab-service/cyber-repo.git` |

---

## 13. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add Space model fields for edit fork configuration
- [ ] Create EditSession model
- [ ] Implement GitWorktreeManager class
- [ ] Add environment variable configuration

### Phase 2: API Endpoints
- [ ] EditSession CRUD endpoints
- [ ] File change management endpoints
- [ ] Submit endpoint with full git workflow
- [ ] Diff preview endpoint

### Phase 3: Git Provider Extensions
- [ ] Add `create_branch` to BaseGitProvider
- [ ] Add `create_pull_request` to BaseGitProvider
- [ ] Implement for BitbucketServerProvider
- [ ] Add `get_pull_request_status` method

### Phase 4: Frontend Integration
- [ ] Edit mode in FileViewer
- [ ] EditSession management UI
- [ ] Change review/diff preview
- [ ] Submit dialog with PR creation

### Phase 5: Operations
- [ ] Admin setup documentation
- [ ] Space configuration UI
- [ ] Monitoring and logging
- [ ] Cleanup jobs for stale worktrees/branches

---

## 14. Appendix

### A. Git Commands Reference

```bash
# Clone bare repo (first time)
GIT_SSH_COMMAND="ssh -i /etc/doclab/git-ssh-key" \
  git clone --bare --mirror ssh://git@example.com/~service/repo.git /cache/repo.git

# Fetch updates
git -C /cache/repo.git fetch --all --prune

# Create worktree with new branch
git -C /cache/repo.git worktree add \
  -b doclab/user/edit-abc123 \
  /tmp/worktrees/session-id \
  origin/master

# Commit with author
git -C /tmp/worktrees/session-id commit \
  --author="User Name <user@email.com>" \
  -m "Title" -m "Description"

# Push
GIT_SSH_COMMAND="ssh -i /etc/doclab/git-ssh-key" \
  git -C /tmp/worktrees/session-id push origin doclab/user/edit-abc123

# Remove worktree
git -C /cache/repo.git worktree remove --force /tmp/worktrees/session-id

# Delete remote branch (after PR merged)
git -C /cache/repo.git push origin --delete doclab/user/edit-abc123
```

### B. Bitbucket API Reference

```bash
# Create PR from fork to main repo
curl -X POST \
  -u "service:token" \
  -H "Content-Type: application/json" \
  "https://git.example.com/rest/api/1.0/projects/REAL/repos/cyber-repo/pull-requests" \
  -d '{
    "title": "PR Title",
    "description": "PR Description",
    "fromRef": {
      "id": "refs/heads/doclab/user/edit-abc123",
      "repository": {
        "project": {"key": "~doclab-service"},
        "slug": "cyber-repo"
      }
    },
    "toRef": {
      "id": "refs/heads/master",
      "repository": {
        "project": {"key": "REAL"},
        "slug": "cyber-repo"
      }
    }
  }'

# Get PR status
curl -u "service:token" \
  "https://git.example.com/rest/api/1.0/projects/REAL/repos/cyber-repo/pull-requests/123"
```

### C. Directory Structure

```
/etc/doclab/
└── git-ssh-key              # SSH private key (mode 600)

/data/doclab/
└── git-cache/
    └── spaces/
        └── {space-uuid}/
            └── edit-fork.git/   # Bare repository

/tmp/doclab-worktrees/
└── {session-uuid}/          # Temporary worktree
    ├── .git -> /data/.../edit-fork.git
    ├── docs/
    │   └── README.md
    └── ...
```
