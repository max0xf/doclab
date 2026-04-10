# Product Requirements Document — Cyber Wiki

## 1. Overview

**Product name:** Cyber Wiki
**Version:** 0.1 (initial)
**Date:** 2026-03-24
**Status:** Draft

### 1.1 Vision

Cyber Wiki is a doc/code collaboration platform built on top of Git. It enables engineering teams to author, review, and evolve documentation and code-adjacent content with full Git-backed history, inline commenting (including by non-Git users), and deep integration with JIRA and Git providers.

### 1.2 Goals

- Lower friction for documenting code and architecture decisions
- Enable non-engineers (PMs, designers, stakeholders) to comment and propose changes without a Git client
- Keep Git as the single source of truth — all changes flow through Git
- Provide JIRA context inline so readers never need to context-switch to find ticket status
- Ship as a self-hosted, single-team product (no multi-tenancy in v1)

### 1.3 Non-goals

- Production deployment (staging only in v1)
- Mobile native apps
- Real-time collaborative editing (Google Docs style)
- Replacing a full-featured Git hosting platform (GitHub/GitLab/Bitbucket)

---

## 2. User Roles

| Role | Description |
|---|---|
| **Admin** | Full access: manage users, spaces, Git sync configs, all documents |
| **Editor** | Create, edit, delete documents within assigned spaces; approve/reject pending changes |
| **Commenter** | Read documents, add inline comments and replies; submit pending changes for review |
| **Viewer** | Read-only access to assigned spaces |
| **Guest** | No account required; can add inline comments on public documents (name + email required) |

---

## 3. Features

### 3.1 Spaces

A **Space** is a top-level organisational unit that groups related documents.

**Requirements:**

- Admins can create, rename, and delete spaces
- Each space has a slug (URL-safe identifier), name, and description
- Spaces can be public (readable by anyone) or private (members only)
- Admins assign users to spaces with a specific role

**Acceptance criteria:**

- `GET /api/wiki/spaces/` returns spaces the authenticated user has access to
- `POST /api/wiki/spaces/` creates a new space (Admin only)
- Public spaces are returned to unauthenticated requests at a future read-only endpoint

### 3.2 Documents

A **Document** is a Markdown or code file associated with a path in a space and optionally synced to a Git file.

**Requirements:**

- Editors can create, edit, rename, and delete documents within their spaces
- Documents support full Markdown: headings, lists, code blocks, tables, links, images
- Diagrams (Mermaid, sequence diagrams) are rendered inline in the viewer
- Tables are rendered as styled HTML tables
- Each document has a `git_path` and `git_branch` linking it to a file in the Git repository
- Changes to a document create a `ChangeRecord` entry

**Acceptance criteria:**

- `GET /api/wiki/spaces/:id/documents/` lists documents
- `PATCH /api/wiki/documents/:id/update/` saves content and writes a `ChangeRecord`
- Viewer renders Mermaid diagram fences as SVG
- Viewer renders `| col | col |` Markdown tables as HTML tables

### 3.3 Inline Comments

Any line range in a document can be annotated with an inline comment. Comments are visible to all users with read access. Guests can comment without registering.

**Requirements:**

- Authenticated users and guests can create inline comments
- Comments are anchored to a `line_start`–`line_end` range
- Comments have replies (threaded, 1 level deep)
- Editors and Admins can resolve or delete comments
- Resolved comments are hidden by default but can be revealed
- Outdated comments (anchor line changed) are flagged with `status = outdated`

**Acceptance criteria:**

- `POST /api/wiki/documents/:id/comments/` accepts guest name + email when unauthenticated
- `POST /api/wiki/comments/:id/resolve/` sets `status = resolved`
- Frontend shows unresolved comments in a gutter beside the editor

### 3.4 Change History

Every save to a document creates an immutable `ChangeRecord` with a diff.

**Requirements:**

- History is accessible per document (`GET /api/wiki/documents/:id/history/`)
- Each record shows: author, timestamp, change type, summary, and unified diff
- Git-originated changes include the commit hash

**Acceptance criteria:**

- History page lists records in reverse-chronological order
- Diff is displayed in a syntax-highlighted unified diff view

### 3.5 Pending Changes

Users with Commenter role (or above) can propose changes to a document. The change enters a review cycle before being applied.

**Requirements:**

- A pending change contains a unified diff and a description
- Status lifecycle: `draft` → `review` → `approved` / `rejected`
- Editors and Admins can approve or reject
- Approving a change applies the diff to the document content and creates a `ChangeRecord`
- Authors can cancel their own draft changes

**Acceptance criteria:**

- `POST /api/wiki/pending-changes/:id/approve/` applies the diff and returns `200`
- `POST /api/wiki/pending-changes/:id/reject/` sets `status = rejected`
- Frontend shows a badge count of pending changes awaiting review

### 3.6 Bidirectional Git Sync

Each space can be linked to a Git repository. Changes flow in both directions.

**Requirements:**

- Admins configure: `repo_url`, `branch`, `base_path`, `direction`
- Directions: Git → Wiki, Wiki → Git, Bidirectional
- Sync can be triggered manually or runs on a schedule (configurable, default: every 5 min)
- Conflicts are detected and surfaced to Admins
- Git → Wiki: file changes in the repo are pulled into document content
- Wiki → Git: document saves are pushed as commits to the repo

**Acceptance criteria:**

- `PUT /api/wiki/spaces/:id/git-sync/` saves the config
- `POST /api/wiki/spaces/:id/git-sync/trigger/` triggers an immediate sync and returns `{ "status": "pending" }`
- Conflict state is shown in the space header

### 3.7 Search

Full-text search across all spaces and documents the user has access to.

**Requirements:**

- Search by keyword across document titles and body text
- Results can be filtered by space
- Results show: document title, space name, excerpt with match highlighted, line number

**Acceptance criteria:**

- `GET /api/wiki/search/?q=term` returns results in relevance order
- `GET /api/wiki/search/?q=term&space_id=3` narrows to a single space
- Results load in under 500 ms for a corpus of 10,000 documents

### 3.8 JIRA Integration

JIRA issue data is surfaced inline in documents.

**Requirements:**

- Admins configure JIRA URL and API token
- A special syntax `[JIRA:KEY-123]` in a document is rendered as a status badge
- Badge shows: key, summary (truncated), status, assignee, priority
- Clicking the badge opens the JIRA issue in a new tab
- Search endpoint allows searching JIRA issues from within the app

**Acceptance criteria:**

- `GET /api/wiki/jira/issues/KEY-123/` returns issue details
- `[JIRA:KEY-123]` in a document renders as a styled badge in the viewer
- Badge data is fetched once per page load and cached for 5 minutes

### 3.9 Access Control

**Requirements:**

- Each space has its own member list with roles
- Global roles (set by Admin) apply as fallback when a space-level role is not set
- Guest users can comment on public spaces without authentication
- API endpoints enforce role-based permissions

**Acceptance criteria:**

- A Viewer cannot `PATCH /api/wiki/documents/:id/update/` (returns `403`)
- A Guest can `POST /api/wiki/documents/:id/comments/` on a public document (returns `201`)

---

## 4. Architecture

### 4.1 Frontend (`src/frontend/`)

- React 18 with TypeScript and Tailwind CSS
- Single-page app with hash-based routing
- Contexts: `AuthContext`, `ThemeContext`, `UserSettingsContext`
- Services communicate with backend via `apiClient` (session + Bearer token)
- Views: `Spaces`, `DocumentEditor`, `Search`, `ChangeHistory`, `PendingChanges`, `JiraIntegration`, `UserManagement`, `Profile`

### 4.2 Backend (`src/backend/`)

- Django 5 + Django REST Framework
- Two Django apps: `users` (auth/profiles) and `wiki` (all content)
- SQLite in development and staging; PostgreSQL can be substituted via `DATABASE_URL`
- Token-based auth: session cookies for browser, Bearer tokens for API/CLI
- OIDC/SSO optional (enabled via `SSO_ENABLED=true`)

### 4.3 Git Sync Service

- Runs in-process via APScheduler (background job)
- Uses GitPython to clone/pull/push repositories
- Conflict detection based on three-way merge
- Sync log stored in `ChangeRecord` with `change_type = git_sync`

### 4.4 Staging Deployment

Two Docker containers behind a reverse proxy (nginx or similar):

```
Internet → nginx → :3000 (frontend: serve -s build)
                 → :8000 (backend: gunicorn config.wsgi)
```

No production environment in v1. Staging environment mirrors production topology.

---

## 5. Data Model (summary)

| Model | Key fields |
|---|---|
| `Space` | slug, name, is_public, created_by |
| `SpaceMember` | space, user, role |
| `Document` | space, title, path, content, git_path, git_branch |
| `InlineComment` | document, line_start, line_end, author, guest_name, status |
| `CommentReply` | comment, content, author, guest_name |
| `ChangeRecord` | document, change_type, author, commit_hash, diff |
| `PendingChange` | document, diff, status, author |
| `GitSyncConfig` | space, repo_url, branch, direction, status |
| `UserProfile` | user, role, sso_provider, settings |

---

## 6. API Summary

| Method | Path | Description |
|---|---|---|
| GET | `/api/wiki/spaces/` | List accessible spaces |
| POST | `/api/wiki/spaces/` | Create space |
| GET/PATCH/DELETE | `/api/wiki/spaces/:id/` | Get/update/delete space |
| GET/PUT | `/api/wiki/spaces/:id/git-sync/` | Get/set git sync config |
| POST | `/api/wiki/spaces/:id/git-sync/trigger/` | Trigger sync |
| GET | `/api/wiki/spaces/:id/documents/` | List documents |
| POST | `/api/wiki/documents/` | Create document |
| GET/PATCH/DELETE | `/api/wiki/documents/:id/` | Get/update/delete document |
| GET | `/api/wiki/documents/:id/history/` | Change history |
| POST | `/api/wiki/documents/:id/apply-change/` | Apply pending change |
| GET/POST | `/api/wiki/documents/:id/comments/` | List/create comments |
| POST | `/api/wiki/comments/:id/resolve/` | Resolve comment |
| POST | `/api/wiki/comments/:id/replies/` | Reply to comment |
| GET | `/api/wiki/pending-changes/` | All pending changes |
| POST | `/api/wiki/pending-changes/:id/approve/` | Approve change |
| POST | `/api/wiki/pending-changes/:id/reject/` | Reject change |
| GET | `/api/wiki/search/` | Full-text search |
| GET | `/api/wiki/jira/search/` | Search JIRA |
| GET | `/api/wiki/jira/issues/:key/` | Get JIRA issue |
| GET | `/api/user_management/v1/me/` | Current user |
| GET | `/api/user_management/v1/status/` | Auth status |
| GET/POST | `/api/user_management/v1/users/` | List/create users |

---

## 7. Open Questions

1. Should the Git sync use webhooks (push-triggered) in addition to polling?
2. What is the preferred Markdown renderer on the frontend — `react-markdown` + `remark-gfm`, or a custom renderer?
3. Should diagram rendering be done server-side (Mermaid CLI) or client-side (Mermaid JS)?
4. Is SQLite acceptable for staging, or should we migrate to PostgreSQL from the start?
5. What is the expected document corpus size for search performance planning?

---

## 8. Milestones

| Milestone | Scope |
|---|---|
| M1 — Scaffold | Project setup, auth, spaces CRUD, document CRUD (no Git sync) |
| M2 — Comments | Inline comments, replies, guest commenting, resolution |
| M3 — History | Change records, history view, diff rendering |
| M4 — Pending Changes | Propose, review, approve/reject, apply |
| M5 — Git Sync | Bidirectional sync, conflict detection |
| M6 — Diagrams & Tables | Mermaid rendering, table rendering |
| M7 — JIRA | Config, `[JIRA:KEY]` badge, search |
| M8 — Search | Full-text search across spaces |
| M9 — Staging Deploy | Docker compose staging environment |
