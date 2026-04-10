# Left Menu Structure Design

## Overview
This document describes the complete structure and behavior of the left navigation menu (sidebar) in Cyber Wiki.

## Visual Hierarchy

```
┌─────────────────────────────────────┐
│ CYBER WIKI                    [☰]   │  ← Header with collapse toggle
├─────────────────────────────────────┤
│                                     │
│ 📊 Dashboard                        │  ← Main navigation
│                                     │
│ REPOSITORY SELECTION                │  ← Section header
│                                     │
│ 📁 Repositories                     │  ← All repositories view
│                                     │
│ ⭐ Favorites                    ›   │  ← Combined Favorites/Recent
│   ┌─────────────────────────────┐  │     (collapsed by default when
│   │ [⭐ Favorites | 🕐 Recent]  │  │      repo is selected)
│   ├─────────────────────────────┤  │
│   │ • real/cyber-repo           │  │  ← When expanded, shows
│   │ • ait/git-stats             │  │     toggle + filtered list
│   │ • maxim.cherey/cyber-repo   │  │
│   └─────────────────────────────┘  │
│                                     │
│ SELECTED REPOSITORY                 │  ← Appears when repo selected
│                                     │
│ 📁 real/cyber-repo          [</>]   │  ← Selected repo with mode toggle
│                                     │
│   ┌─ Developer Mode ─────────────┐ │
│   │ 📄 .agents                   │ │  ← File/folder tree
│   │ 📂 .claude              ›    │ │     (Developer mode)
│   │ 📂 .cursor              ›    │ │
│   │ 📂 .github              ›    │ │
│   │ 📄 .vscode                   │ │
│   │ 📂 docs                 ›    │ │
│   │ 📄 README.md                 │ │
│   └──────────────────────────────┘ │
│                                     │
│   OR                                │
│                                     │
│   ┌─ Document Mode ──────────────┐ │
│   │ 📄 Executive Summary         │ │  ← Document tree with
│   │ 📂 Architecture         ›    │ │     human-readable titles
│   │   📄 System Design           │ │     (Document mode)
│   │   📄 API Guidelines          │ │
│   │ 📄 Getting Started           │ │
│   └──────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ 👤 admin                       ▼   │  ← User menu (bottom)
└─────────────────────────────────────┘
```

## Component Breakdown

### 1. Header
- **Cyber Wiki** branding text
- **Collapse toggle** (☰) - collapses sidebar to icon-only mode

### 2. Main Navigation
- **Dashboard** - Main overview page
- Always visible, not affected by repository selection

### 3. Repository Selection Section

#### 3.1 Repositories Button
- Opens the full repository list view
- Active when on repositories page without a specific repo selected

#### 3.2 Combined Favorites/Recent Section
**Behavior:**
- Shows either Favorites or Recent repositories based on toggle
- **Default filter:** Favorites
- **Expanded by default** when no repository is selected
- **Auto-collapses** when a repository is selected
- Can be manually expanded/collapsed via chevron

**Structure:**
```
⭐ Favorites                    ›
  [⭐ Favorites | 🕐 Recent]      ← Filter toggle (only when expanded)
  • repo1                         ← Repository list (filtered)
  • repo2
  • repo3
```

**Filter Toggle:**
- Two-button switch: `[⭐ Favorites | 🕐 Recent]`
- Active filter is highlighted
- Switches between showing favorites and recent repositories
- Shows "No favorites yet" or "No recent repositories" when empty

#### 3.3 Selected Repository
**Appears when:** A repository is selected from the list

**Structure:**
```
SELECTED REPOSITORY
📁 real/cyber-repo          [</>]
```

**View Mode Toggle:**
- Dropdown button `[</>]` next to repository name
- Two modes:
  - **Developer Mode** (💻 Code icon) - Shows raw file structure
  - **Document Mode** (📄 Document icon) - Shows document hierarchy with titles
- Preference is saved per repository in the database

### 4. File/Document Tree

#### 4.1 Developer Mode (GitHub-like)
**Purpose:** Raw, technical view of the repository

**Features:**
- Shows complete directory and file structure
- Technical file/folder icons based on type
- Expandable folders with chevron indicators
- Click file to navigate to file viewer
- Click folder to expand/collapse

**Example:**
```
📂 .claude              ›
📂 docs                 ›
  📂 components         ›
  📄 README.md
  📄 executive-summary.md
📄 package.json
📄 tsconfig.json
```

#### 4.2 Document Mode (Confluence-like)
**Purpose:** Clean, reading-optimized view of documentation

**Features:**
- Filters to show only document files (`.md`, `.mdx` by default)
- Displays human-readable titles instead of filenames
- Generic page icons instead of technical file icons
- Hides non-document files (code, configs, etc.)
- Folder-as-Page: Folders with README.md/index.md are clickable pages

**Title Extraction:**
1. First `# H1` heading in markdown
2. Fallback to YAML frontmatter `title:` field
3. Fallback to formatted filename (e.g., `api_guideline.md` → "Api Guideline")

**Example:**
```
📄 Executive Summary
📂 Architecture         ›
  📄 System Design
  📄 API Guidelines
  📄 Database Schema
📄 Getting Started
📄 Contributing Guide
```

**Configuration (.cyberwiki.yml):**
Repositories can customize document mode behavior:

```yaml
wiki:
  include_paths: ["/docs", "/architecture"]  # Only show these folders
  extensions: [".md", ".mdx"]                # Document file types
  title_strategy: "h1"                       # h1, frontmatter, or filename
```

### 5. User Menu (Bottom)
- User avatar/name
- Dropdown with:
  - Profile Settings
  - Sign Out

## Responsive Behavior

### Desktop (>1024px)
- Sidebar always visible
- Can be collapsed to icon-only mode
- Width: 256px (expanded), 64px (collapsed)

### Mobile (<1024px)
- Sidebar hidden by default
- Hamburger menu to open
- Overlay backdrop when open
- Closes after navigation

## State Management

### Persisted State (Database)
- **View mode per repository** (developer/document)
- **Favorite repositories** list
- **Recent repositories** list (last 10)

### Session State (Local)
- **Sidebar collapsed** state
- **Repo list expanded** state
- **Current filter** (favorites/recent)
- **Expanded folders** in tree

## Interaction Patterns

### Selecting a Repository
1. User clicks repository from Favorites/Recent or main list
2. Combined section auto-collapses
3. "Selected Repository" section appears
4. File/Document tree loads based on saved view mode preference
5. URL updates: `#repositories?repo=real_cyber-repo`

### Switching View Modes
1. User clicks view mode toggle `[</>]` next to repository name
2. Dropdown shows: Developer | Document
3. User selects mode
4. Tree reloads with new mode
5. Preference saved to database for this repository

### Filtering Favorites/Recent
1. User expands combined section (if collapsed)
2. Toggle buttons appear: `[⭐ Favorites | 🕐 Recent]`
3. User clicks desired filter
4. List updates to show filtered repositories
5. Header icon/text updates to match filter

### Navigating Files/Documents
1. User clicks file in tree
2. Main content area loads file viewer
3. URL updates: `#repositories?repo=real_cyber-repo&path=docs/README.md`
4. File remains highlighted in tree

## API Endpoints

### View Mode Preferences
- `GET /api/user_management/v1/preferences/view-mode/{repository_id}/`
- `POST /api/user_management/v1/preferences/view-mode/`

### Repository Trees
- `GET /api/wiki/repositories/{repository_id}/tree/?mode=developer`
- `GET /api/wiki/repositories/{repository_id}/tree/?mode=document`

### Repository Configuration
- `GET /api/wiki/repositories/{repository_id}/config/`

### Favorites & Recent
- `GET /api/user_management/v1/favorites/`
- `POST /api/user_management/v1/favorites/add/`
- `DELETE /api/user_management/v1/favorites/{repository_id}/remove/`
- `GET /api/user_management/v1/recent/`
- `POST /api/user_management/v1/recent/add/`

## Implementation Files

### Frontend
- `src/frontend/components/Layout.tsx` - Main sidebar layout
- `src/frontend/components/Sidebar/FileTree.tsx` - Developer mode tree
- `src/frontend/components/Sidebar/DocumentTree.tsx` - Document mode tree
- `src/frontend/services/wikiApi.ts` - API client for trees
- `src/frontend/services/repositoryApi.ts` - API client for repos

### Backend
- `src/backend/users/views.py` - User preferences and repo management
- `src/backend/users/models.py` - RepositoryViewMode model
- `src/backend/wiki/views.py` - Tree and config endpoints
- `src/backend/wiki/config_parser.py` - .cyberwiki.yml parser
- `src/backend/wiki/title_extractor.py` - Markdown title extraction
- `src/backend/wiki/tree_builder.py` - Tree structure builder
