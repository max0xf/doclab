# Backend Design

## 1. Architecture Overview

### 1.1 Technology Stack

**Core Framework:**
- Django 5.2.9 — Web framework
- Django REST Framework 3.16.1 — REST API layer
- Python 3.14

**Key Libraries:**
- `drf-spectacular` 0.27.2 — OpenAPI schema generation and Swagger UI
- `Authlib` 1.6.9 — OIDC/SSO authentication
- `GitPython` 3.1.44 — Git repository operations
- `APScheduler` 3.10.4 — Background sync tasks
- `cryptography` 44.0.2 — Token encryption (Fernet)
- `PyYAML` 6.0.1 — Configuration parsing
- `requests` 2.32.5 — HTTP client for external APIs
- `gunicorn` 23.0.0 — WSGI production server
- `django-cors-headers` 4.6.0 — CORS support
- `django-brotli` 0.2.1 — Brotli compression

**Database:**
- SQLite (development, CI)
- PostgreSQL (production) via `psycopg2-binary` 2.9.10

**Testing:**
- `pytest` 8.3.4 + `pytest-django` 4.9.0 + `pytest-mock` 3.14.0 + `pytest-cov` 4.1.0

### 1.2 Project Structure

```
src/backend/
├── config/                    # Django project settings
│   ├── settings.py           # Main configuration
│   ├── urls.py               # Root URL routing
│   └── wsgi.py               # WSGI application
├── users/                     # User management app
│   ├── models.py             # User, Profile, Tokens, Preferences
│   ├── views.py              # User management APIs
│   ├── auth_views.py         # Authentication endpoints
│   ├── auth_urls.py          # Auth URL routing
│   ├── urls.py               # User management URL routing
│   ├── token_authentication.py  # Bearer token auth
│   └── permissions.py        # Role-based permissions
├── wiki/                      # Wiki/document management app
│   ├── models.py             # Space, Document, Comment, Changes
│   ├── views.py              # Wiki CRUD APIs
│   ├── views_comments.py     # File comment APIs
│   ├── views_user_changes.py # User changes APIs
│   ├── tree_builder.py       # Tree construction logic
│   ├── title_extractor.py    # Title extraction from markdown
│   ├── config_parser.py      # .doclab.yml parser
│   └── urls.py               # Wiki URL routing
├── git_provider/              # Git provider abstraction
│   ├── base.py               # Abstract provider interface
│   ├── factory.py            # Provider factory
│   ├── models.py             # GitToken (encrypted credentials)
│   ├── providers/
│   │   ├── github.py         # GitHub implementation
│   │   └── bitbucket_server.py  # Bitbucket Server implementation
│   ├── views.py              # Git provider APIs
│   └── urls.py               # Git provider URL routing
├── source_provider/           # Source abstraction layer
│   ├── base.py               # SourceAddress, BaseSourceProvider
│   ├── git_source.py         # Git source implementation
│   ├── views.py              # Source provider APIs
│   └── urls.py               # Source provider URL routing
├── enrichment_provider/       # Enrichment system
│   ├── base.py               # BaseEnrichmentProvider interface
│   ├── comment_enrichment.py # Comment enrichments
│   ├── pr_enrichment.py      # PR diff enrichments
│   ├── local_changes_enrichment.py  # User changes enrichments
│   ├── views.py              # Enrichment APIs
│   └── urls.py               # Enrichment URL routing
├── debug_cache/               # Debug/caching utilities
├── data/                      # Runtime data directory
│   └── db.sqlite3            # SQLite database (dev)
├── manage.py                  # Django management script
└── requirements.txt           # Python dependencies
```

### 1.3 Application Modules

| Module | Responsibility |
|--------|---------------|
| **users** | User authentication, roles, profiles, API tokens, favorites, recent repos, view mode preferences |
| **wiki** | Spaces, documents, inline comments, change history, pending changes, git sync, repository trees |
| **git_provider** | Abstract interface for Git hosting providers (GitHub, Bitbucket Server), repository operations, PR diffs |
| **source_provider** | Universal source addressing (`SourceAddress`), source content retrieval, abstraction over git providers |
| **enrichment_provider** | Extensible enrichment system (comments, PR diffs, local changes), dual mapping (raw/rendered) |
| **debug_cache** | Development utilities for caching API responses |

## 2. Authentication & Authorization

### 2.1 Authentication Mechanisms

**Dual Authentication Support:**

1. **Session Cookie Authentication** (Browser)
   - Django session-based auth
   - Cookie: `sessionid`
   - CSRF protection via `csrftoken` cookie
   - Used by frontend SPA

2. **Bearer Token Authentication** (API/CLI)
   - Custom token in `Authorization: Bearer <token>` header
   - Stored in `ApiToken` model
   - Generated via `secrets.token_urlsafe(48)`
   - Used for programmatic access

**Implementation:**
```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.token_authentication.BearerTokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}
```

### 2.2 User Roles

**Role Hierarchy:**
```python
class UserRole(models.TextChoices):
    ADMIN = 'admin'        # Full system access
    EDITOR = 'editor'      # Create/edit documents
    COMMENTER = 'commenter'  # Read + comment
    VIEWER = 'viewer'      # Read-only
    GUEST = 'guest'        # Unauthenticated comments
```

**Permission Matrix:**

| Action | Admin | Editor | Commenter | Viewer | Guest |
|--------|-------|--------|-----------|--------|-------|
| View documents | ✅ | ✅ | ✅ | ✅ | ✅ (public) |
| Create/edit documents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete documents | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add comments | ✅ | ✅ | ✅ | ❌ | ✅ (public) |
| Resolve comments | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve pending changes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Configure git sync | ✅ | ❌ | ❌ | ❌ | ❌ |

### 2.3 SSO/OIDC Support

**Configuration:**
```bash
SSO_ENABLED=true
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_DISCOVERY_URL=https://sso.example.com/.well-known/openid-configuration
```

**Flow:**
1. User clicks "Login with SSO"
2. Redirect to OIDC provider
3. Callback to `/oauth/callback`
4. Exchange code for tokens
5. Create/update user in Django
6. Establish session

**Implementation:** Uses `Authlib` library for OIDC protocol handling.

---

## 3. Data Models

### 3.1 User Management Models

**UserProfile:**
```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=UserRole.choices)
    sso_provider = models.CharField(max_length=50, null=True)
    last_sso_login = models.DateTimeField(null=True)
    settings = models.JSONField(default=dict)  # User preferences
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**ApiToken:**
```python
class ApiToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)  # "CLI Access", "CI/CD"
    token = models.CharField(max_length=64, unique=True)
    last_used_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @staticmethod
    def generate_token() -> str:
        return secrets.token_urlsafe(48)
```

**FavoriteRepository:**
```python
class FavoriteRepository(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    repository_id = models.CharField(max_length=255)  # "projectkey_reposlug"
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['user', 'repository_id']]
```

**RecentRepository:**
```python
class RecentRepository(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    repository_id = models.CharField(max_length=255)
    last_viewed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['user', 'repository_id']]
        ordering = ['-last_viewed_at']
```

**RepositoryViewMode:**
```python
class RepositoryViewMode(models.Model):
    class ViewMode(models.TextChoices):
        DEVELOPER = 'developer'  # Raw file tree
        DOCUMENT = 'document'    # Filtered doc tree
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    repository_id = models.CharField(max_length=255)
    view_mode = models.CharField(max_length=20, choices=ViewMode.choices)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['user', 'repository_id']]
```

### 3.2 Wiki Models

**FileComment:**
```python
class FileComment(models.Model):
    class Status(models.TextChoices):
        OPEN = 'open'
        RESOLVED = 'resolved'
    
    class AnchoringStatus(models.TextChoices):
        ANCHORED = 'anchored'  # Comment still at original location
        MOVED = 'moved'        # Line moved, comment re-anchored
        OUTDATED = 'outdated'  # Cannot re-anchor
        DELETED = 'deleted'    # Line deleted
    
    # User and source
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    source_uri = models.CharField(max_length=500, db_index=True, null=True)
    
    # Git repository information
    git_provider = models.CharField(max_length=50)  # 'github', 'bitbucket_server'
    project_key = models.CharField(max_length=255)
    repo_slug = models.CharField(max_length=255)
    branch = models.CharField(max_length=255)
    file_path = models.CharField(max_length=1000)
    
    # Raw mapping (line-based)
    line_start = models.PositiveIntegerField(null=True)
    line_end = models.PositiveIntegerField(null=True)
    
    # Rendered mapping (block-based)
    block_id = models.CharField(max_length=200, null=True)
    block_type = models.CharField(max_length=50, null=True)
    
    # Line anchoring (for tracking comments when code changes)
    line_content = models.TextField(blank=True)
    line_content_hash = models.CharField(max_length=64, blank=True)
    context_before = models.JSONField(default=list)  # 2-3 lines before
    context_after = models.JSONField(default=list)   # 2-3 lines after
    file_version_hash = models.CharField(max_length=40, blank=True)
    commit_sha = models.CharField(max_length=40, blank=True)
    original_line_number = models.PositiveIntegerField(null=True)
    anchoring_status = models.CharField(max_length=20, choices=AnchoringStatus.choices)
    computed_line_number = models.PositiveIntegerField(null=True)
    
    # Comment content
    text = models.TextField()
    is_resolved = models.BooleanField(default=False)
    
    # Threading
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True)
    thread_id = models.CharField(max_length=100, null=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**UserChange:**
```python
class UserChange(models.Model):
    class Status(models.TextChoices):
        ADDED = 'added'        # Pending changes
        COMMITTED = 'committed'  # Committed to PR
        REJECTED = 'rejected'  # Discarded
    
    repository_full_name = models.CharField(max_length=255)  # "REAL/cyber-repo"
    file_path = models.CharField(max_length=1024)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    original_content = models.TextField()
    modified_content = models.TextField()
    diff_hunks = models.JSONField(default=list)  # Unified diff format
    status = models.CharField(max_length=20, choices=Status.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Space, Document, GitSyncConfig:**
```python
class Space(models.Model):
    slug = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Document(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE)
    title = models.CharField(max_length=500)
    path = models.CharField(max_length=1000)
    content = models.TextField(blank=True)
    doc_type = models.CharField(max_length=20)  # 'markdown', 'code'
    git_path = models.CharField(max_length=1000, blank=True)
    git_branch = models.CharField(max_length=255, default='main')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class GitSyncConfig(models.Model):
    space = models.OneToOneField(Space, on_delete=models.CASCADE)
    repo_url = models.CharField(max_length=1000)
    branch = models.CharField(max_length=255, default='main')
    base_path = models.CharField(max_length=1000, default='/')
    direction = models.CharField(max_length=20)  # 'git_to_wiki', 'wiki_to_git', 'bidirectional'
    status = models.CharField(max_length=20)  # 'synced', 'conflict', 'pending', 'error'
    last_sync_at = models.DateTimeField(null=True)
```

### 3.3 Git Provider Models

**GitToken:**
```python
class GitToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    provider = models.CharField(max_length=32)  # 'github', 'bitbucket_server'
    base_url = models.CharField(max_length=255, null=True)  # For self-hosted
    confluence_url = models.CharField(max_length=255, null=True)
    jira_url = models.CharField(max_length=255, null=True)
    jira_email = models.EmailField(max_length=255, null=True)
    
    # Encrypted tokens (Fernet encryption)
    _token = models.BinaryField(null=True, db_column='token')
    _zta_token = models.BinaryField(null=True, db_column='zta_token')
    _confluence_token = models.BinaryField(null=True, db_column='confluence_token')
    _jira_token = models.BinaryField(null=True, db_column='jira_token')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def set_token(self, plaintext: str) -> None:
        """Encrypt and store token."""
        self._token = Fernet(encryption_key).encrypt(plaintext.encode())
    
    def get_token(self) -> str | None:
        """Decrypt and return token."""
        if not self._token:
            return None
        return Fernet(encryption_key).decrypt(bytes(self._token)).decode()
```

---

### Left Menu Navigation & Tree Building

The backend supports two navigation modes for repositories, allowing user-specific preferences to dictate how a repository is explored:
- **Developer Mode**: Returns a raw file tree representing the exact repository structure.
- **Document Mode**: Returns a filtered, human-readable hierarchy of documentation.

Key components:
- **`tree_builder.py`**: Constructs hierarchical tree structures (`TreeNode`) from flat directory entries.
- **`config_parser.py`**: Parses `.doclab.yml` repository configuration to define `include_paths`, `extensions`, and `title_strategy`.
- **`title_extractor.py`**: Extracts human-readable titles from markdown files (e.g., from the first `# H1` tag, frontmatter, or formatted filename) for Document Mode.
- **Preferences**: User preferences for the default view mode per repository are stored in the database.

## 4. API Endpoints

### 4.1 Authentication APIs

**Base Path:** `/auth/`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login/` | Login with username/password | No |
| POST | `/auth/logout/` | Logout (clear session) | Yes |
| GET | `/auth/sso/` | Initiate SSO login | No |
| GET | `/oauth/callback` | SSO callback handler | No |

**Example - Login:**
```json
POST /auth/login/
{"username": "user@example.com", "password": "password123"}

Response:
{"user": {"id": 1, "username": "user@example.com", "role": "editor"}}
```

### 4.2 User Management APIs

**Base Path:** `/api/user_management/v1/`

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/me/` | Get current user | Any |
| GET | `/me/settings/` | Get user settings | Any |
| POST | `/me/settings/update/` | Update user settings | Any |
| GET | `/status/` | Auth status check | None |
| GET | `/users/` | List all users | Admin |
| POST | `/users/create/` | Create new user | Admin |
| GET | `/users/<id>/` | Get user details | Admin |
| POST | `/users/<id>/role/` | Update user role | Admin |
| DELETE | `/users/<id>/delete/` | Delete user | Admin |
| GET | `/tokens/` | List API tokens | Any |
| POST | `/tokens/` | Create API token | Any |
| DELETE | `/tokens/<id>/` | Delete API token | Any |
| GET/POST | `/service-tokens/` | Manage service tokens | Any |
| GET | `/favorites/` | List favorite repos | Any |
| POST | `/favorites/add/` | Add favorite repo | Any |
| DELETE | `/favorites/<repo_id>/remove/` | Remove favorite | Any |
| GET | `/recent/` | List recent repos | Any |
| POST | `/recent/add/` | Add recent repo | Any |
| GET | `/preferences/view-mode/<repo_id>/` | Get view mode | Any |
| POST | `/preferences/view-mode/` | Set view mode | Any |

**Example - Create API Token:**
```json
POST /api/user_management/v1/tokens/
{"name": "CLI Access"}

Response:
{"id": 1, "name": "CLI Access", "token": "cy_AbCdEf...", "createdAt": "2026-04-01T14:00:00Z"}
```

**Example - Set View Mode:**
```json
POST /api/user_management/v1/preferences/view-mode/
{"repository_id": "real_cyber-repo", "view_mode": "document"}

Response:
{"repository_id": "real_cyber-repo", "view_mode": "document", "updated_at": "2026-04-01T14:00:00Z"}
```

### 4.3 Repository APIs

**Base Path:** `/api/repositories/v1/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List repositories |
| GET | `/search/` | Search repositories |
| GET | `/<repo_id>/` | Get repository details |
| GET | `/<repo_id>/branches/` | List branches |
| GET | `/<repo_id>/content/` | List directory contents |
| GET | `/<repo_id>/file/` | Get file content |

**Example - List Repositories:**
```json
GET /api/repositories/v1/?page=1&per_page=30

Response:
{
  "repositories": [
    {
      "id": "real_cyber-repo",
      "name": "cyber-repo",
      "fullName": "REAL/cyber-repo",
      "description": "Cyber Wiki documentation",
      "defaultBranch": "master",
      "isPrivate": true,
      "updatedAt": "2026-04-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### 4.4 Wiki APIs

**Base Path:** `/api/wiki/`

**Repository Trees:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/repositories/<repo_id>/tree/` | Get repository tree |
| GET | `/repositories/<repo_id>/config/` | Get repository config |

**Example - Get Repository Tree:**
```json
GET /api/wiki/repositories/real_cyber-repo/tree/?mode=document&branch=master

Response:
{
  "tree": [
    {
      "name": "README.md",
      "path": "docs/README.md",
      "type": "file",
      "title": "Cyber Wiki Documentation",
      "size": 1234
    },
    {
      "name": "architecture",
      "path": "docs/architecture",
      "type": "dir",
      "children": [...]
    }
  ]
}
```

**File Comments:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/file-comments/` | List file comments |
| POST | `/file-comments/` | Create file comment |
| GET | `/file-comments/<id>/` | Get comment details |
| PATCH | `/file-comments/<id>/` | Update comment |
| DELETE | `/file-comments/<id>/` | Delete comment |
| GET | `/repo-comment-counts/` | Get comment counts per file |

**Example - Create File Comment:**
```json
POST /api/wiki/file-comments/
{
  "git_provider": "bitbucket_server",
  "project_key": "REAL",
  "repo_slug": "cyber-repo",
  "branch": "master",
  "file_path": "src/backend/users/models.py",
  "line_start": 42,
  "line_end": 45,
  "text": "Should we add validation here?",
  "line_content": "def create_user_profile(...):",
  "context_before": ["@receiver(post_save, sender=User)"],
  "context_after": ["    if created:"]
}

Response:
{
  "id": 123,
  "user": {"id": 1, "username": "user@example.com"},
  "line_start": 42,
  "text": "Should we add validation here?",
  "is_resolved": false,
  "thread_id": "thread_123",
  "created_at": "2026-04-01T14:30:00Z"
}
```

**User Changes:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user-changes/<full_path>/` | Get user changes for file |
| POST | `/user-changes/<full_path>/save/` | Save user changes |
| POST | `/user-changes/<full_path>/commit/` | Commit changes to PR |
| DELETE | `/user-changes/<full_path>/discard/` | Discard changes |

**Spaces & Documents:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces/` | List spaces |
| POST | `/spaces/create/` | Create space |
| GET | `/spaces/<id>/` | Get space details |
| GET | `/documents/` | Create document |
| GET | `/documents/<id>/` | Get document |
| GET | `/documents/<id>/history/` | Get change history |

### 4.5 Git Provider APIs

**Base Path:** `/api/git/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/providers/` | List available providers |
| GET | `/pull-requests/` | List pull requests |
| GET | `/pull-requests/<pr_number>/` | Get PR details |
| GET | `/pull-requests/<pr_number>/files/` | Get PR file changes |
| GET | `/pull-requests/<pr_number>/diff/` | Get PR diff for file |

**Example - Get PR Diff:**
```json
GET /api/git/pull-requests/123/diff/?repo=real_cyber-repo&file_path=src/backend/users/models.py

Response:
{
  "file_path": "src/backend/users/models.py",
  "hunks": [
    {
      "old_start": 42,
      "old_lines": 5,
      "new_start": 42,
      "new_lines": 6,
      "lines": [
        {"type": "context", "content": "def create_user_profile(...):", "old_line_number": 43, "new_line_number": 43},
        {"type": "add", "content": "    # Added validation", "old_line_number": null, "new_line_number": 44}
      ]
    }
  ]
}
```

### 4.6 Enrichment Provider APIs

**Base Path:** `/api/enrich/v1/`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/enrichments/` | Get enrichments for source |
| GET | `/enrichments/<id>/` | Get enrichment details |
| GET | `/enrichments/<id>/actions/` | Get available actions |
| POST | `/enrichments/<id>/execute/` | Execute action |

**Example - Get Enrichments:**
```json
GET /api/enrich/v1/enrichments/?source_uri=git://bitbucket_server/real_cyber-repo/src/backend/users/models.py@master

Response:
{
  "enrichments": [
    {
      "id": "comment_123",
      "type": "comment",
      "raw_mapping": {"start_line": 42, "end_line": 45},
      "data": {"text": "Should we add validation here?", "resolved": false},
      "visual": {"marker_type": "badge", "color": "orange", "icon": "MessageSquare"},
      "actions": ["reply", "resolve", "edit", "delete"]
    },
    {
      "id": "pr_diff_123_44",
      "type": "pr_diff",
      "raw_mapping": {"start_line": 44, "end_line": 44},
      "data": {"change_type": "added", "pr_number": 123},
      "visual": {"marker_type": "highlight", "color": "green"}
    }
  ]
}
```

## 5. Core Logic & Algorithms

### 5.1 Repository Tree Building

**Algorithm:** Build hierarchical tree from flat directory entries

**Process:**

1. **Fetch Directory Entries:**
   ```python
   entries = git_provider.list_directory(repo, path, branch)
   ```

2. **Filter for Document Mode:**
   ```python
   if mode == 'document':
       allowed_extensions = config.get('document_extensions', ['.md', '.mdx'])
       entries = filter_document_entries(entries, allowed_extensions)
   ```

3. **Build Tree Structure:**
   ```python
   nodes = build_tree_from_entries(entries, current_path)
   ```

4. **Extract Titles (Document Mode):**
   ```python
   if mode == 'document':
       title_map = {}
       for entry in entries:
           if entry.type == 'file':
               content = git_provider.get_file_content(repo, entry.path, branch)
               title = extract_title(content.content, entry.name, strategy='h1')
               title_map[entry.path] = title
       nodes = add_titles_to_tree(nodes, title_map)
   ```

5. **Remove Empty Directories:**
   ```python
   if mode == 'document':
       nodes = remove_empty_directories(nodes)
   ```

### 5.2 Title Extraction

**Algorithm:** Extract human-readable title from markdown file

**Strategies:**

1. **H1 Heading:**
   ```python
   match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
   if match:
       return match.group(1).strip()
   ```

2. **YAML Frontmatter:**
   ```python
   if content.startswith('---'):
       end_match = re.search(r'\n---\n', content[3:])
       if end_match:
           frontmatter = yaml.safe_load(content[3:3 + end_match.start()])
           return frontmatter.get('title')
   ```

3. **Filename Formatting:**
   ```python
   name = filename.rsplit('.', 1)[0]
   name = name.replace('_', ' ').replace('-', ' ')
   return ' '.join(word.capitalize() for word in name.split())
   ```

**Fallback Chain:** H1 → Frontmatter → Filename

### 5.3 Comment Line Anchoring

**Problem:** When code changes, comment line numbers become outdated.

**Solution:** Store line content + context, re-anchor using fuzzy matching.

**Algorithm:**

1. **On Comment Creation:**
   ```python
   comment.line_content = file_lines[line_start:line_end+1]
   comment.line_content_hash = sha256(comment.line_content)
   comment.context_before = file_lines[line_start-3:line_start]
   comment.context_after = file_lines[line_end+1:line_end+4]
   comment.original_line_number = line_start
   comment.commit_sha = current_commit_sha
   ```

2. **On File View (Re-anchoring):**
   ```python
   current_content = get_file_content(repo, path, branch)
   current_lines = current_content.split('\n')
   
   # Try exact hash match first
   for i, line in enumerate(current_lines):
       if sha256(line) == comment.line_content_hash:
           comment.computed_line_number = i + 1
           comment.anchoring_status = 'anchored'
           return
   
   # Try fuzzy match with context
   best_match = find_best_match(
       comment.line_content,
       comment.context_before,
       comment.context_after,
       current_lines
   )
   
   if best_match.score > 0.8:
       comment.computed_line_number = best_match.line_number
       comment.anchoring_status = 'moved'
   else:
       comment.anchoring_status = 'outdated'
   ```

3. **Fuzzy Matching:**
   ```python
   def find_best_match(target_content, context_before, context_after, lines):
       best_score = 0
       best_line = None
       
       for i in range(len(lines)):
           # Check content similarity
           content_score = similarity(target_content, lines[i])
           
           # Check context similarity
           before_score = similarity(context_before, lines[max(0, i-3):i])
           after_score = similarity(context_after, lines[i+1:i+4])
           
           total_score = (content_score * 0.6 + 
                         before_score * 0.2 + 
                         after_score * 0.2)
           
           if total_score > best_score:
               best_score = total_score
               best_line = i + 1
       
       return Match(line_number=best_line, score=best_score)
   ```

### 5.4 Enrichment Dual Mapping

**Problem:** Different renderers (raw text, Markdown AST, YAML tree) need different position references.

**Solution:** Store both raw line mapping and rendered block mapping.

**Example:**

**Markdown File:**
```markdown
# Heading 1
This is a paragraph.
```

**Raw Mapping:**
```python
{
  "start_line": 1,
  "end_line": 1,
  "start_column": null,
  "end_column": null
}
```

**Rendered Mapping:**
```python
{
  "block_type": "heading",
  "block_id": "markdown-heading-1",
  "node_path": ["root", "heading", "0"],
  "offset": null
}
```

**Usage:**
- Raw mapping: Used for line-based editors, plain text view
- Rendered mapping: Used for AST-based views (MarkdownTreeView, YAMLTreeView)

### 5.5 Git Token Encryption

**Algorithm:** Encrypt user tokens at rest using Fernet symmetric encryption

**Key Generation:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Encryption:**
```python
from cryptography.fernet import Fernet

key = settings.GIT_TOKEN_ENCRYPTION_KEY.encode()
fernet = Fernet(key)

# Encrypt
encrypted = fernet.encrypt(plaintext_token.encode())
git_token._token = encrypted

# Decrypt
decrypted = fernet.decrypt(bytes(git_token._token)).decode()
```

**Security:**
- Tokens never stored in plaintext
- Encryption key stored in environment variable
- Key rotation supported (decrypt with old key, re-encrypt with new key)

## 6. Use Cases

### 6.1 User Views Repository

**Flow:**

1. User navigates to `#repositories?repo=real_cyber-repo`
2. Frontend calls `GET /api/repositories/v1/real_cyber-repo/`
3. Backend:
   - Gets user's git token from `GitToken` model
   - Creates git provider instance via factory
   - Calls `git_provider.get_repository(repo)`
   - Returns repository metadata
4. Frontend calls `GET /api/user_management/v1/preferences/view-mode/real_cyber-repo/`
5. Backend returns user's preferred view mode (default: `'developer'`)
6. Frontend calls `GET /api/wiki/repositories/real_cyber-repo/tree/?mode=developer&branch=master`
7. Backend:
   - Gets directory entries from git provider
   - Builds tree structure using `tree_builder.py`
   - Returns tree JSON
8. Frontend renders `FileTree` component with tree data

### 6.2 User Switches to Document Mode

**Flow:**

1. User clicks view mode dropdown, selects "Document"
2. Frontend calls `POST /api/user_management/v1/preferences/view-mode/`
   ```json
   {"repository_id": "real_cyber-repo", "view_mode": "document"}
   ```
3. Backend:
   - Creates or updates `RepositoryViewMode` record
   - Returns updated preference
4. Frontend calls `GET /api/wiki/repositories/real_cyber-repo/tree/?mode=document&branch=master`
5. Backend:
   - Gets directory entries
   - Filters to only `.md` and `.mdx` files
   - Extracts titles from markdown files using `title_extractor.py`
   - Builds tree with titles
   - Removes empty directories
   - Returns tree JSON
6. Frontend renders `DocumentTree` component with titles

### 6.3 User Adds Comment to File

**Flow:**

1. User clicks line in file viewer
2. Frontend shows comment form
3. User types comment and clicks "Submit"
4. Frontend calls `POST /api/wiki/file-comments/`
5. Backend:
   - Creates `FileComment` record
   - Stores line content and context for anchoring
   - Generates thread_id
   - Returns comment with ID
6. Frontend refreshes enrichments
7. Frontend calls `GET /api/enrich/v1/enrichments/?source_uri=git://...`
8. Backend:
   - Queries `CommentEnrichmentProvider`
   - Returns enrichments including new comment
9. Frontend renders comment badge on line

### 6.4 User Edits File Content

**Flow:**

1. User clicks "Edit" button in file viewer
2. Frontend shows editor with current content
3. User makes changes
4. User clicks "Save Changes"
5. Frontend calculates diff between original and modified content
6. Frontend calls `POST /api/wiki/user-changes/REAL/cyber-repo/master/src/backend/users/models.py/save/`
7. Backend:
   - Creates or updates `UserChange` record
   - Stores diff hunks
   - Returns user change ID
8. Frontend shows "Changes saved" message
9. When user views file again:
   - Frontend calls `GET /api/enrich/v1/enrichments/?source_uri=...`
   - Backend includes `LocalChangesEnrichmentProvider`
   - Returns user's pending changes as enrichments
   - Frontend merges changes into virtual content

### 6.5 User Commits Changes to PR

**Flow:**

1. User clicks "Commit to PR" button
2. Frontend shows PR creation form
3. User enters PR title and description
4. User clicks "Create PR"
5. Frontend calls `POST /api/wiki/user-changes/REAL/cyber-repo/master/src/backend/users/models.py/commit/`
6. Backend:
   - Gets user's git token
   - Creates git provider instance
   - Creates new branch
   - Commits changes to branch
   - Creates pull request via git provider API
   - Updates `UserChange` status to `'committed'`
   - Returns PR URL
7. Frontend shows success message with PR link

### 6.6 Code Changes, Comments Re-anchor

**Flow:**

1. Developer pushes new commit to branch
2. User views file in Cyber Wiki
3. Frontend calls `GET /api/wiki/file-comments/?repo=real_cyber-repo&path=src/backend/users/models.py&branch=master`
4. Backend:
   - Gets current file content
   - For each comment:
     - Runs line anchoring algorithm
     - Updates `computed_line_number` and `anchoring_status`
   - Returns comments with updated line numbers
5. Frontend renders comments at new line positions
6. Comments with `anchoring_status='outdated'` shown with warning badge

### 6.7 User Views PR Diff

**Flow:**

1. User selects PR from dropdown in file viewer
2. Frontend calls `GET /api/git/pull-requests/123/diff/?repo=real_cyber-repo&file_path=src/backend/users/models.py`
3. Backend:
   - Gets user's git token
   - Creates git provider instance
   - Calls `git_provider.get_pull_request_diff(repo, pr_number, file_path)`
   - Returns diff hunks
4. Frontend calls `GET /api/enrich/v1/enrichments/?source_uri=...`
5. Backend:
   - Queries `PREnrichmentProvider`
   - Converts diff hunks to enrichments
   - Returns enrichments with `type='pr_diff'`
6. Frontend:
   - Builds ephemeral content by inserting deleted lines
   - Parses to AST
   - Renders with diff highlighting (green/red backgrounds)
   - Shows PR badges with links

---

## 7. Configuration

### 7.1 Environment Variables

**Required:**
```bash
DJANGO_SECRET_KEY=<secret-key>
```

**Database:**
```bash
DB_ENGINE=sqlite  # or 'postgresql'
DB_NAME=cyber_wiki
DB_USER=postgres
DB_PASSWORD=<password>
DB_HOST=localhost
DB_PORT=5432
```

**Git Provider:**
```bash
GIT_PROVIDER=bitbucket_server  # or 'github'
GIT_API_URL=https://git.example.com
GIT_API_TOKEN=<token>
GIT_TOKEN_ENCRYPTION_KEY=<fernet-key>
```

**CORS:**
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
CSRF_TRUSTED_ORIGINS=http://localhost:3000,https://app.example.com
```

**SSO/OIDC:**
```bash
SSO_ENABLED=true
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_DISCOVERY_URL=https://sso.example.com/.well-known/openid-configuration
```

**JIRA:**
```bash
JIRA_URL=https://jira.example.com
JIRA_API_TOKEN=<token>
```

**Other:**
```bash
DEBUG=false
ALLOWED_HOSTS=localhost,127.0.0.1,app.example.com
DATA_DIR=/var/lib/cyber-wiki
FRONTEND_URL=https://app.example.com
```

### 7.2 Repository Configuration

**File:** `.doclab.yml` (in repository root)

**Schema:**
```yaml
# Document mode configuration
document_mode:
  # Paths to include in document tree
  include_paths:
    - /docs
    - /architecture
  
  # File extensions to treat as documents
  document_extensions:
    - .md
    - .mdx
  
  # Title extraction strategy
  title_strategy: h1  # 'h1', 'frontmatter', or 'filename'
  
  # Folder-as-page behavior
  folder_readme_names:
    - README.md
    - index.md
```

**Example:**
```yaml
document_mode:
  include_paths:
    - /docs
    - /specs
  document_extensions:
    - .md
    - .mdx
  title_strategy: frontmatter
  folder_readme_names:
    - README.md
    - INDEX.md
```

---

## 8. Enrichment System

### 8.1 BaseEnrichmentProvider Interface

**Abstract Methods:**

```python
class BaseEnrichmentProvider(ABC):
    @abstractmethod
    def get_enrichment_type(self) -> str:
        """Return enrichment type identifier ('comment', 'pr_diff', 'local_change')."""
        pass
    
    @abstractmethod
    def get_enrichments(self, source_address: SourceAddress) -> list[Enrichment]:
        """Get all enrichments for a source address."""
        pass
    
    @abstractmethod
    def get_enrichment_by_id(self, enrichment_id: str) -> Enrichment:
        """Get specific enrichment by ID."""
        pass
    
    @abstractmethod
    def supports_actions(self) -> bool:
        """Whether this enrichment provider supports user actions."""
        pass
    
    @abstractmethod
    def get_available_actions(self, enrichment_id: str) -> list[EnrichmentAction]:
        """Get available actions for an enrichment."""
        pass
    
    @abstractmethod
    def execute_action(self, enrichment_id: str, action: str, params: dict) -> ActionResult:
        """Execute an action on an enrichment."""
        pass
```

### 8.2 Enrichment Data Structure

```python
@dataclass
class Enrichment:
    id: str
    type: str  # 'pr_diff', 'comment', 'local_change', 'annotation'
    source_address: SourceAddress
    
    # Dual mapping system
    raw_mapping: RawMapping | None  # Line-based (start_line, end_line)
    rendered_mapping: RenderedMapping | None  # Block-based (block_id, block_type)
    
    # Type-specific data
    data: dict[str, Any]
    
    # Visual presentation
    visual: EnrichmentVisual  # marker_type, color, icon, label, tooltip
    
    # Available actions
    actions: list[str]  # ['reply', 'resolve', 'edit', 'delete']
    
    # Metadata
    created_at: str
    created_by: str
    updated_at: str
```

### 8.3 Enrichment Providers

**CommentEnrichmentProvider:**
- Queries `FileComment` model
- Supports actions: reply, resolve, edit, delete
- Visual: orange badge with comment count
- Dual mapping: line numbers + block IDs

**PREnrichmentProvider:**
- Queries git provider for PR diffs
- Read-only (no actions)
- Visual: green/red highlights for added/deleted lines
- Dual mapping: line numbers + AST nodes

**LocalChangesEnrichmentProvider:**
- Queries `UserChange` model
- Supports actions: commit, discard
- Visual: blue highlight for modified lines
- Dual mapping: line numbers + block IDs

### 8.4 Data Flow

1. Frontend requests enrichments for a `SourceAddress` (`GET /api/enrich/v1/enrichments/?source_uri=...`)
2. Backend queries all registered `EnrichmentProvider`s (Comments, PRs, Local Changes)
3. Providers return unified `Enrichment` payloads with dual mapping
4. Frontend performs actions (e.g., `POST /api/enrich/v1/enrichments/<id>/execute/` with action `reply`)
5. Backend executes specific logic within corresponding provider

---

## 9. Git Provider Abstraction

### 9.1 BaseGitProvider Interface

**Abstract Methods:**

```python
class BaseGitProvider(ABC):
    # Repositories
    def list_repositories(self, page: int, per_page: int) -> list[Repository]
    def search_repositories(self, query: str) -> list[Repository]
    def get_repository(self, repo: str) -> Repository
    def get_repository_metadata(self, repo: str) -> RepositoryMetadata
    
    # Branches
    def list_branches(self, repo: str) -> list[Branch]
    def get_branch(self, repo: str, branch: str) -> Branch
    
    # Commits
    def list_commits(self, repo: str, branch: str) -> list[Commit]
    
    # Pull Requests
    def list_pull_requests(self, repo: str, state: str) -> list[PullRequest]
    def get_pull_request(self, repo: str, pr_number: int) -> PullRequest
    def get_pull_request_files(self, repo: str, pr_number: int) -> list[PullRequestFileChange]
    def get_pull_request_diff(self, repo: str, pr_number: int, file_path: str) -> PullRequestDiff
    
    # Content
    def get_file_content(self, repo: str, path: str, ref: str) -> FileContent
    def list_directory(self, repo: str, path: str, ref: str) -> list[DirectoryEntry]
    
    # Blame
    def get_blame(self, repo: str, path: str, ref: str) -> list[BlameHunk]
```

### 9.2 Implementations

**GitHub Provider:**
- Uses GitHub REST API v3
- Authentication: Personal Access Token
- Base URL: `https://api.github.com`
- Repository format: `owner/repo`

**Bitbucket Server Provider:**
- Uses Bitbucket Server REST API 1.0
- Authentication: Personal Access Token + optional ZTA token
- Base URL: Configurable (self-hosted)
- Repository format: `PROJECT/repo-slug`

### 9.3 Provider Factory

```python
def get_git_provider(user: User) -> BaseGitProvider:
    """Get git provider instance for user."""
    git_token = GitToken.objects.get(user=user)
    
    if git_token.provider == 'github':
        return GitHubProvider(
            token=git_token.get_token(),
            base_url=git_token.base_url or 'https://api.github.com'
        )
    elif git_token.provider == 'bitbucket_server':
        return BitbucketServerProvider(
            token=git_token.get_token(),
            zta_token=git_token.get_zta_token(),
            base_url=git_token.base_url
        )
    else:
        raise ValueError(f'Unknown provider: {git_token.provider}')
```

---

## 10. Key Design Decisions

- **Extensible Enrichment Pipeline** — By abstracting comments, diffs, and local changes as "enrichments", the backend can support any future overlay (security alerts, linters, etc.) without changing the core document models.
- **SourceAddress URI** — Resources in the wiki are universally identifiable via a custom URI scheme (e.g., `git://repo-id/path/to/file`), making enrichments location-agnostic.
- **One Django project, isolated domains** — Clean separation between `users`, `wiki`, `git_provider`, and `enrichment_provider`.
- **SQLite in dev, Postgres-ready** — `DATABASE_URL` env var switches the backend.
- **`drf-spectacular`** — auto-generates OpenAPI schema at `/api/schema/`; Swagger UI at `/api/docs/`
