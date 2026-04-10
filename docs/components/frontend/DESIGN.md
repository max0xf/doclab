# Frontend Design

## 1. Architecture Overview

### 1.1 Technology Stack

**Core Framework:**
- React 18.3.1 with TypeScript 4.9.5
- Single-page application (SPA) architecture
- No server-side rendering

**Styling:**
- Tailwind CSS 3.4.18 (utility-first CSS framework)
- CSS custom properties for theming (`--bg-primary`, `--text-primary`, etc.)
- No CSS modules or styled-components

**Key Libraries:**
- `unified` + `remark-parse` + `remark-gfm` — Markdown AST parsing
- `react-markdown` — Markdown rendering fallback
- `lucide-react` — Icon library
- `@tanstack/react-virtual` — Virtual scrolling for large lists
- `rehype-expressive-code` — Syntax highlighting for code blocks
- `js-yaml` — YAML parsing

**Build Tools:**
- `react-scripts` 5.0.1 (Create React App)
- Node.js 25.1.0

### 1.2 Project Structure

```
src/frontend/
├── App.tsx                    # Root component, routing logic
├── index.tsx                  # Entry point
├── types.ts                   # Global TypeScript types and enums
├── constants.ts               # API URLs and constants
├── components/                # Shared UI components
│   ├── Layout.tsx            # Main layout with sidebar
│   ├── LoginPage.tsx         # Authentication page
│   ├── CommentsPanel.tsx     # Comment thread UI
│   ├── Sidebar/
│   │   ├── FileTree.tsx      # Developer mode tree
│   │   └── DocumentTree.tsx  # Document mode tree
│   └── Enrichments/
│       ├── EnrichedCodeView.tsx
│       ├── EnrichmentMarker.tsx
│       └── EnrichmentPanel.tsx
├── context/                   # React Context providers
│   ├── AuthContext.tsx       # User authentication state
│   ├── ThemeContext.tsx      # Light/dark theme
│   ├── RepositoryContext.tsx # Current repository state
│   └── UserSettingsContext.tsx
├── services/                  # API client modules
│   ├── apiClient.ts          # Base HTTP client
│   ├── authApi.ts
│   ├── repositoryApi.ts
│   ├── wikiApi.ts
│   ├── commentsApi.ts
│   ├── enrichmentProviderApi.ts
│   └── sourceProviderApi.ts
├── views/                     # Lazy-loaded page components
│   ├── Dashboard/
│   ├── Repositories/
│   │   ├── RepositoryDetail.tsx
│   │   └── components/
│   │       ├── FileViewer/
│   │       │   ├── FileViewer.tsx
│   │       │   ├── FileContent.tsx
│   │       │   ├── renderers/
│   │       │   │   ├── FormatRenderer.ts
│   │       │   │   ├── MarkdownFormatRenderer.tsx
│   │       │   │   ├── CodeFormatRenderer.tsx
│   │       │   │   ├── YAMLFormatRenderer.tsx
│   │       │   │   └── PlainTextRenderer.tsx
│   │       │   ├── enrichments/
│   │       │   │   └── types.ts
│   │       │   ├── components/
│   │       │   │   ├── MarkdownTreeView.tsx
│   │       │   │   └── YAMLTreeView.tsx
│   │       │   └── utils/
│   │       │       └── contentTypeDetector.ts
│   ├── Search/
│   ├── Profile/
│   └── ...
└── hooks/                     # Custom React hooks
```

---

## 2. Routing System

### 2.1 Hash-Based Routing

**Implementation:** Client-side hash-based routing (no HTML5 History API).

**Rationale:** Avoids server-side catch-all configuration in staging environments. All routes handled by `index.html`.

**Route Format:**
```
#<view>?<query-params>
```

**Route Definitions** (from `types.ts`):
```typescript
enum Urls {
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
}
```

**Route Examples:**
- `#repositories` — Repository list
- `#repositories?repo=123&path=docs/README.md` — File viewer
- `#search?q=authentication` — Search results
- `#profile` — User profile

### 2.2 Navigation Implementation

**Hash Change Listener:**
```typescript
useEffect(() => {
  const onHashChange = () => {
    const hash = window.location.hash.slice(1);
    const [pageName] = hash.split('?');
    setActiveView(pageName || Urls.Dashboard);
  };
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
}, []);
```

**Navigation Function:**
```typescript
const navigate = (view: string) => {
  window.location.hash = view;
};
```

### 2.3 Lazy Loading

All views are lazy-loaded using `React.lazy()` to minimize initial bundle size:

```typescript
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const Repositories = React.lazy(() => import('./views/Repositories'));
// ... etc
```

Wrapped in `React.Suspense` with a loading fallback:
```typescript
<React.Suspense fallback={<ViewLoadingFallback />}>
  {activeView === Urls.Dashboard && <Dashboard />}
  {activeView === Urls.Repositories && <Repositories />}
  {/* ... */}
</React.Suspense>
```

---

## 3. State Management

### 3.1 Architecture

**No global state library** (Redux, Zustand, MobX). State management uses:

1. **React Context** — Low-frequency, app-wide state
2. **Local Component State** — View-specific data
3. **URL Parameters** — Navigation state (current repo, file path)

### 3.2 React Contexts

**AuthContext** (`context/AuthContext.tsx`):
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

**ThemeContext** (`context/ThemeContext.tsx`):
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

**UserSettingsContext** (`context/UserSettingsContext.tsx`):
```typescript
interface UserSettings {
  theme: Theme;
  defaultSpaceId?: number;
}
```

**RepositoryContext** (`context/RepositoryContext.tsx`):
```typescript
interface RepositoryContextType {
  currentRepository: Repository | null;
  setCurrentRepository: (repo: Repository | null) => void;
}
```

### 3.3 Local State Pattern

Views fetch and manage their own data:

```typescript
function RepositoryDetail() {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const repo = await repositoryApi.getById(repoId);
        setRepository(repo);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [repoId]);
}
```

---

## 4. Left Menu Navigation (Sidebar)

### 4.1 Dual Navigation Modes

The sidebar provides **two distinct navigation modes** per repository, addressing different user personas:

**Developer Mode (GitHub-like):**
- Shows complete raw file structure
- All files visible (code, config, hidden files)
- Technical file icons based on extensions
- Filenames displayed as-is

**Document Mode (Confluence-like):**
- Shows only documentation files (`.md`, `.mdx`)
- Hides technical files (`.ts`, `.json`, `.py`, etc.)
- Human-readable titles extracted from file content
- Generic "page" icons instead of file extension icons
- "Folder-as-Page" behavior (folders with `README.md` act as clickable pages)

### 4.2 Mode Switching Implementation

**UI Location:** Dropdown next to repository name in sidebar

**Persistence:** User's preferred mode stored in backend per repository

**API Calls:**
```typescript
// Get current mode
const mode = await repositoryApi.getViewMode(repositoryId);

// Set mode
await repositoryApi.setViewMode(repositoryId, 'developer' | 'document');
```

**State Management:**
```typescript
const [viewMode, setViewMode] = useState<'developer' | 'document'>('developer');

useEffect(() => {
  if (repoId) {
    const mode = await repositoryApi.getViewMode(repoId);
    setViewMode(mode);
  }
}, [repoId]);
```

### 4.3 FileTree Component (Developer Mode)

**Location:** `components/Sidebar/FileTree.tsx`

**Features:**
- Recursive tree structure
- Lazy loading of folder contents on expand
- Auto-expansion to show current file
- Click folder → navigate to folder view
- Click file → navigate to file viewer

**Tree Data Structure:**
```typescript
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
  title?: string; // Only in document mode
}
```

**API Endpoint:**
```
GET /api/wiki/repositories/{id}/tree?mode=developer&branch={branch}&path={path}
```

**Implementation Pattern:**
```typescript
function TreeNodeItem({ node, level, expandedPaths, onToggleExpand }) {
  const [children, setChildren] = useState<TreeNode[]>(node.children || []);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (node.type === 'dir') {
      if (!isExpanded && children.length === 0) {
        setLoading(true);
        const response = await wikiApi.getRepositoryTree(
          repositoryId, 'developer', branch, node.path
        );
        setChildren(response.tree);
        setLoading(false);
      }
      onToggleExpand(node.path, !isExpanded);
    } else {
      navigate(`#repositories?repo=${repositoryId}&path=${node.path}`);
    }
  };

  return (
    <div>
      <button onClick={handleClick} style={{ paddingLeft: `${level * 12}px` }}>
        {node.type === 'dir' ? <Folder /> : <FileCode />}
        <span>{node.name}</span>
      </button>
      {isExpanded && children.map(child => 
        <TreeNodeItem node={child} level={level + 1} />
      )}
    </div>
  );
}
```

### 4.4 DocumentTree Component (Document Mode)

**Location:** `components/Sidebar/DocumentTree.tsx`

**Differences from FileTree:**
- Displays `node.title` instead of `node.name`
- Uses generic `FileText` icon for all documents
- Filters out non-document files (done server-side)

**Title Extraction (Backend):**
1. Parse first `# H1` heading from Markdown
2. Fallback: Format filename (`api_guide.md` → "Api Guide")

**API Endpoint:**
```
GET /api/wiki/repositories/{id}/tree?mode=document&branch={branch}&path={path}
```

### 4.5 Favorites and Recent Repositories

**UI:** Collapsible accordion sections at top of sidebar

**Auto-collapse:** When a repository is selected, the favorites/recent list collapses to save space

**Data Sources:**
```typescript
// Favorites (user-starred repos)
const favorites = await repositoryApi.getFavorites();

// Recent (last 5 accessed repos)
const recent = await repositoryApi.getRecent();
```

**Toggle Implementation:**
```typescript
const [repoListExpanded, setRepoListExpanded] = useState(true);

useEffect(() => {
  if (currentRepoId) {
    setRepoListExpanded(false); // Auto-collapse when repo selected
  }
}, [currentRepoId]);
```

---

## 5. Virtual Content Rendering Pipeline

### 5.1 Overview

The **Virtual Content Rendering Pipeline** is a format-agnostic framework for rendering file content with independent metadata layers (enrichments). The original file content is **never modified directly**; instead, an ephemeral "virtual content" is generated and rendered.

**Key Principle:** Separation of content from metadata. Enrichments (comments, diffs, annotations) are overlaid on content without mutating the source.

### 5.2 Pipeline Phases

**Phase 1: Content Type Detection**

**Location:** `views/Repositories/components/FileViewer/utils/contentTypeDetector.ts`

**Algorithm:**
1. Check file extension against known mappings
2. If unknown, analyze content heuristically (patterns, shebangs)
3. Return `ContentTypeInfo`

**Content Types:**
```typescript
type ContentType = 'markdown' | 'code' | 'plaintext';

interface ContentTypeInfo {
  type: ContentType;
  language?: string; // For code: 'javascript', 'python', etc.
  extension?: string;
}
```

**Extension Mappings:**
- Markdown: `.md`, `.markdown`, `.mdown`, `.mkd`
- Code: `.js`, `.ts`, `.py`, `.java`, `.cpp`, `.go`, `.rs`, etc. (40+ languages)
- YAML: `.yaml`, `.yml`
- Plaintext: `.txt`, `.text`

**Heuristic Detection:**
```typescript
// Markdown patterns
const markdownPatterns = [
  /^#{1,6}\s+/m,        // Headings
  /^\*\s+/m,            // Unordered lists
  /^\d+\.\s+/m,         // Ordered lists
  /^\[.+\]\(.+\)/m,     // Links
  /^```/m,              // Code blocks
];

// Code patterns
const codePatterns = [
  /^#!\//, // Shebang
  /^import\s+/m,
  /^from\s+.+\s+import/m,
  /^package\s+/m,
];
```

**Phase 2: Renderer Selection**

**Location:** `views/Repositories/components/FileViewer/renderers/FormatRenderer.ts`

**Registry Pattern:**
```typescript
class FormatRendererRegistry {
  private renderers: Map<string, FormatRenderer> = new Map();

  register(renderer: FormatRenderer): void {
    this.renderers.set(renderer.name, renderer);
  }

  getRenderer(contentType: ContentTypeInfo): FormatRenderer | null {
    for (const renderer of this.renderers.values()) {
      if (renderer.canHandle(contentType)) {
        return renderer;
      }
    }
    return null;
  }
}
```

**Registered Renderers:**
```typescript
formatRendererRegistry.register(new MarkdownFormatRenderer());
formatRendererRegistry.register(new CodeFormatRenderer());
formatRendererRegistry.register(new YAMLFormatRenderer());
formatRendererRegistry.register(new PlainTextRenderer());
```

**Phase 3: Parsing**

**Interface:**
```typescript
interface FormatRenderer {
  name: string;
  supportedTypes: ContentTypeInfo['type'][];
  supportedEnrichments: Enrichment['type'][];
  
  parse(content: string, contentType: ContentTypeInfo, prDiffData?: any): ParseResult;
  render(parseResult: ParseResult, enrichments: Enrichment[], options: RenderOptions): ReactNode;
  canHandle(contentType: ContentTypeInfo): boolean;
}

interface ParseResult {
  ast: any;                  // Format-specific AST
  blocks: BlockMap[];        // Block ID to line mapping
  metadata?: Record<string, any>;
}

interface BlockMap {
  blockId: string;
  rawLines: number[];        // Which raw lines this block represents
  renderedLines?: number[];  // Which rendered lines (if applicable)
  type: string;              // 'markdown_heading', 'code_line', etc.
  metadata?: Record<string, any>;
}
```

**Phase 4: Ephemeral Content Generation**

For files with PR diffs, the renderer builds **ephemeral content** by inserting deleted lines:

```typescript
// Original file (current state)
Line 1: import React from 'react';
Line 2: function App() {
Line 3:   return <div>Hello</div>;
Line 4: }

// PR Diff (hunks)
- Line 2: function MyApp() {
+ Line 2: function App() {

// Ephemeral content (for rendering)
Line 1: import React from 'react';
Line 2: function MyApp() {        // DELETED (shown with strikethrough)
Line 3: function App() {           // ADDED (shown with green background)
Line 4:   return <div>Hello</div>;
Line 5: }
```

**Implementation:**
```typescript
let ephemeralContent = content;
const lineChangeTypes = new Map<number, 'add' | 'delete' | 'context'>();

if (prDiffData && prDiffData.hunks) {
  const currentLines = content.split('\n');
  const ephemeralLines: string[] = [];
  
  prDiffData.hunks.forEach(hunk => {
    hunk.lines.forEach(line => {
      if (line.type === 'delete') {
        ephemeralLines.push(line.content);
        lineChangeTypes.set(ephemeralLineNumber, 'delete');
      } else if (line.type === 'add') {
        ephemeralLines.push(line.content);
        lineChangeTypes.set(ephemeralLineNumber, 'add');
      } else {
        ephemeralLines.push(line.content);
        lineChangeTypes.set(ephemeralLineNumber, 'context');
      }
    });
  });
  
  ephemeralContent = ephemeralLines.join('\n');
}
```

**Phase 5: AST Parsing**

Each renderer parses content into an Abstract Syntax Tree:

**Markdown (using `unified` + `remark`):**
```typescript
const processor = unified().use(remarkParse).use(remarkGfm);
const ast = processor.parse(ephemeralContent) as Root;
```

**YAML (using `js-yaml`):**
```typescript
const ast = yaml.load(content);
```

**Code (line-based):**
```typescript
const lines = content.split('\n');
const ast = { type: 'code', lines };
```

**Phase 6: Block Map Generation**

Map raw file lines to rendered blocks:

```typescript
// Markdown: Each line is a block
const blocks: BlockMap[] = lines.map((_, index) => ({
  blockId: `markdown-line-${index + 1}`,
  rawLines: [index + 1],
  type: 'markdown_line',
  metadata: {},
}));

// YAML: Each key-value pair is a block
const blocks: BlockMap[] = yamlNodes.map((node, index) => ({
  blockId: `yaml-node-${index}`,
  rawLines: [node.startLine, node.endLine],
  type: 'yaml_mapping',
  metadata: { key: node.key },
}));
```

**Phase 7: Enrichment Mapping**

Convert enrichments to dual mappings (raw lines + rendered blocks):

```typescript
interface Enrichment {
  id: string;
  type: 'comment' | 'diff' | 'annotation' | 'highlight';
  
  // Dual mapping
  rawMapping: RawMapping;
  renderedMapping: RenderedMapping;
  
  // Visual representation
  visual: EnrichmentVisual;
  
  // Data
  data: any;
  createdAt: string;
  createdBy: string;
}

interface RawMapping {
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

interface RenderedMapping {
  blockIds: string[];
  positions?: Array<{
    blockId: string;
    offset?: number;
    lineOffset?: number;
  }>;
}

interface EnrichmentVisual {
  markerType: 'gutter' | 'inline' | 'overlay' | 'highlight' | 'badge';
  color: 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'purple';
  icon?: string;
  label?: string;
  tooltip?: string;
  priority: number;
}
```

**Phase 8: Rendering**

Render AST with enrichments applied:

```typescript
render(parseResult: ParseResult, enrichments: Enrichment[], options: RenderOptions): ReactNode {
  return (
    <MarkdownTreeView
      nodes={parseResult.ast.nodes}
      fileComments={enrichments.filter(e => e.type === 'comment')}
      diffLines={new Set(enrichments.filter(e => e.type === 'diff').map(e => e.rawMapping.startLine))}
      onLineClick={options.onLineClick}
    />
  );
}
```

### 5.3 Format Renderers

**MarkdownFormatRenderer** (`renderers/MarkdownFormatRenderer.tsx`):

**AST Conversion:**
```typescript
// Convert MDAST (remark AST) to UnifiedNode format
interface UnifiedNode {
  type: string;
  position: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  value: string;
  data?: {
    nodeType: string;
    changeType?: 'added' | 'deleted' | 'modified';
    depth?: number;      // For headings
    ordered?: boolean;   // For lists
  };
  children?: UnifiedNode[];
}
```

**Rendering:** `MarkdownTreeView` component renders nodes as collapsible blocks with enrichment badges

**CodeFormatRenderer** (`renderers/CodeFormatRenderer.tsx`):

**Syntax Highlighting:** Uses `rehype-expressive-code` for syntax highlighting

**Line-based Rendering:** Each line is a separate block with line numbers

**YAMLFormatRenderer** (`renderers/YAMLFormatRenderer.tsx`):

**AST Parsing:** Uses `js-yaml` to parse YAML into object tree

**Rendering:** `YAMLTreeView` component renders as collapsible key-value tree

**PlainTextRenderer** (`renderers/PlainTextRenderer.tsx`):

**Fallback:** Simple `<pre>` tag with line wrapping

### 5.4 MarkdownTreeView Component

**Location:** `views/Repositories/components/FileViewer/components/MarkdownTreeView.tsx`

**Features:**
- Groups consecutive nodes with same `changeType` into visual blocks
- Applies background colors based on change type:
  - Green (`#e6ffed`) for added
  - Red (`#ffeef0`) for deleted
  - Yellow (`#fffbdd`) for modified
  - Orange (`#fff4e5`) for comments
- Shows badges for:
  - PR number (clickable link to PR)
  - Comment count (clickable to open comment panel)
  - Line numbers
- Strikethrough text for deleted content

**Block Grouping Algorithm:**
```typescript
const groupedBlocks: UnifiedNode[][] = [];
let currentBlock: UnifiedNode[] = [];
let currentChangeType: string | undefined = undefined;

nodes.forEach(node => {
  const nodeChangeType = node.data?.changeType;
  
  if (nodeChangeType !== currentChangeType || !nodeChangeType) {
    if (currentBlock.length > 0) {
      groupedBlocks.push(currentBlock);
    }
    currentBlock = [node];
    currentChangeType = nodeChangeType;
  } else {
    currentBlock.push(node);
  }
});
```

**Visual Styling:**
```typescript
let backgroundColor = 'transparent';
let borderLeft = 'none';

if (blockComments.length > 0) {
  backgroundColor = '#fff4e5';
  borderLeft = '3px solid #ff9800';
} else if (changeType === 'added') {
  backgroundColor = '#e6ffed';
  borderLeft = '3px solid #28a745';
} else if (changeType === 'deleted') {
  backgroundColor = '#ffeef0';
  borderLeft = '3px solid #d73a49';
} else if (changeType === 'modified') {
  backgroundColor = '#fffbdd';
  borderLeft = '3px solid #ffc107';
}
```

---

## 6. Enrichment System

### 6.1 Enrichment Types

**Comment Enrichment:**
```typescript
interface CommentEnrichment {
  type: 'comment';
  rawMapping: { startLine: number; endLine: number };
  data: {
    text: string;
    resolved: boolean;
    replyCount: number;
    replies?: Array<{
      id: string;
      text: string;
      author: string;
      createdAt: string;
    }>;
  };
  visual: {
    markerType: 'badge';
    color: 'orange';
    icon: 'MessageSquare';
    priority: 10;
  };
}
```

**Diff Enrichment (PR Changes):**
```typescript
interface DiffEnrichment {
  type: 'diff';
  rawMapping: { startLine: number; endLine: number };
  data: {
    changeType: 'added' | 'deleted' | 'modified';
    prNumber?: number;
    prTitle?: string;
    prAuthor?: string;
  };
  visual: {
    markerType: 'highlight';
    color: 'green' | 'red' | 'yellow';
    priority: 5;
  };
}
```

**Annotation Enrichment:**
```typescript
interface AnnotationEnrichment {
  type: 'annotation';
  data: {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  };
  visual: {
    markerType: 'gutter';
    color: 'blue' | 'yellow' | 'red';
    icon: 'Info' | 'AlertTriangle' | 'XCircle';
  };
}
```

### 6.2 Dual Mapping System

**Problem:** Different formats render content differently. A line in raw Markdown may map to multiple rendered blocks.

**Solution:** Enrichments store both raw line positions and rendered block IDs.

**Example:**
```markdown
# Heading 1
This is a paragraph.
```

**Raw Mapping:**
- Line 1: `# Heading 1`
- Line 2: `This is a paragraph.`

**Rendered Mapping:**
- Block 1: `<h1>Heading 1</h1>`
- Block 2: `<p>This is a paragraph.</p>`

**Enrichment on Line 1:**
```typescript
{
  rawMapping: { startLine: 1, endLine: 1 },
  renderedMapping: { blockIds: ['markdown-heading-1'] }
}
```

### 6.3 Visual Representations

**Marker Types:**
- `gutter` — Icon in left gutter (line numbers area)
- `inline` — Inline badge within text
- `overlay` — Floating overlay on hover
- `highlight` — Background color
- `badge` — Badge at end of line/block

**Color Coding:**
- `green` — Added content (PR diffs)
- `red` — Deleted content (PR diffs)
- `yellow` — Modified content (PR diffs)
- `orange` — Comments
- `blue` — Info annotations
- `purple` — Highlights (search results)

### 6.4 Interactive Collaboration

**Comment Badge Click:**
```typescript
const handleCommentClick = (lineNumber: number) => {
  // Open comments panel
  setShowCommentsPanel(true);
  setSelectedLine(lineNumber);
  
  // Scroll to comments for this line
  const comments = fileComments.filter(c => 
    c.computed_line_number === lineNumber
  );
  setActiveComments(comments);
};
```

**PR Badge Click:**
```typescript
<a
  href={`https://git.example.com/pull-requests/${prNumber}`}
  target="_blank"
  onClick={e => e.stopPropagation()}
>
  <GitPullRequest size={12} />#{prNumber}
</a>
```

**Line Click (Add Comment):**
```typescript
const onLineClick = (lineNumber: number) => {
  setCommentDraft({
    lineStart: lineNumber,
    lineEnd: lineNumber,
    content: '',
  });
  setShowCommentForm(true);
};
```

---

## 7. API Layer

### 7.1 Base API Client

**Location:** `services/apiClient.ts`

**Features:**
- CSRF token handling (Django)
- Session cookie authentication
- Automatic JSON parsing
- Error handling

**Implementation:**
```typescript
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRFToken'] = getCsrfToken();
  }

  const res = await fetch(`${AUTH_API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = { request };
```

### 7.2 Service Modules

**repositoryApi.ts:**
```typescript
export const repositoryApi = {
  getAll: () => apiClient.request<Repository[]>('/api/repositories/'),
  getById: (id: string) => apiClient.request<Repository>(`/api/repositories/${id}/`),
  getFavorites: () => apiClient.request<string[]>('/api/repositories/favorites/'),
  getRecent: () => apiClient.request<string[]>('/api/repositories/recent/'),
  getViewMode: (id: string) => apiClient.request<'developer' | 'document'>(`/api/repositories/${id}/view-mode/`),
  setViewMode: (id: string, mode: 'developer' | 'document') => 
    apiClient.request(`/api/repositories/${id}/view-mode/`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
};
```

**wikiApi.ts:**
```typescript
export const wikiApi = {
  getRepositoryTree: (repoId: string, mode: 'developer' | 'document', branch: string, path?: string) =>
    apiClient.request<{ tree: TreeNode[] }>(
      `/api/wiki/repositories/${repoId}/tree?mode=${mode}&branch=${branch}&path=${path || ''}`
    ),
  getFileContent: (repoId: string, path: string, branch: string) =>
    apiClient.request<{ content: string }>(
      `/api/wiki/repositories/${repoId}/file?path=${path}&branch=${branch}`
    ),
};
```

**commentsApi.ts:**
```typescript
export const commentsApi = {
  getFileComments: (repoId: string, path: string) =>
    apiClient.request<FileComment[]>(`/api/comments/file?repo=${repoId}&path=${path}`),
  createComment: (data: CreateCommentRequest) =>
    apiClient.request<FileComment>('/api/comments/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveComment: (commentId: string) =>
    apiClient.request(`/api/comments/${commentId}/resolve/`, { method: 'POST' }),
};
```

---

## 8. Authentication

### 8.1 Session Cookie Authentication

**Backend:** Django session-based authentication

**Frontend:** Session cookie automatically sent with `credentials: 'include'`

**AuthContext Implementation:**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      try {
        const user = await authApi.getCurrentUser();
        setState({ isAuthenticated: true, user, isLoading: false });
      } catch {
        setState({ isAuthenticated: false, user: null, isLoading: false });
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const user = await authApi.login(username, password);
    setState({ isAuthenticated: true, user, isLoading: false });
  };

  const logout = async () => {
    await authApi.logout();
    setState({ isAuthenticated: false, user: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 8.2 Protected Routes

**Pattern:**
```typescript
function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Layout>{/* ... views ... */}</Layout>;
}
```

### 8.3 Optional SSO/OIDC

**Environment Variable:** `SSO_ENABLED=true`

**Login Flow:**
1. User clicks "Login with SSO"
2. Redirect to SSO provider
3. Callback to `/auth/sso/callback`
4. Backend creates session
5. Redirect to `#dashboard`

---

## 9. Theming System

### 9.1 CSS Custom Properties

**Theme Variables:**
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border-color: #e0e0e0;
  --sidebar-bg: #f8f9fa;
  --sidebar-text: #495057;
  --sidebar-active: #e9ecef;
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --border-color: #404040;
  --sidebar-bg: #252525;
  --sidebar-text: #cccccc;
  --sidebar-active: #3a3a3a;
}
```

### 9.2 Theme Toggle

**ThemeContext:**
```typescript
const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};
```

---

## 10. Key Design Decisions

### 10.1 Virtual Content Rendering

**Rationale:** Prevents destructive edits. Multiple enrichments (diffs, comments, annotations) can coexist without conflict. Enables seamless integration between plain text source and rich structured views.

**Trade-offs:**
- ✅ Non-destructive enrichments
- ✅ Format-agnostic architecture
- ✅ Easy to add new enrichment types
- ❌ Increased complexity
- ❌ Memory overhead for ephemeral content

### 10.2 Dual Navigation Modes

**Rationale:** Addresses friction between developers (need raw code context) and PMs/designers (need clean documentation).

**Trade-offs:**
- ✅ Persona-specific UX
- ✅ Reduces cognitive load
- ❌ Requires backend title extraction
- ❌ Maintenance of two tree components

### 10.3 Hash Routing

**Rationale:** Avoids server-side catch-all configuration for staging environments.

**Trade-offs:**
- ✅ Simple deployment
- ✅ No server config needed
- ❌ Ugly URLs (`#repositories`)
- ❌ No SSR support

### 10.4 No Global State Library

**Rationale:** Data volumes don't justify Redux/Zustand in v1. Most state is view-specific.

**Trade-offs:**
- ✅ Simpler architecture
- ✅ Smaller bundle size
- ✅ Easier to understand
- ❌ Prop drilling for shared state
- ❌ May need refactor if app grows

### 10.5 Tailwind CSS

**Rationale:** Utility-first styling, rapid development, no CSS modules.

**Trade-offs:**
- ✅ Fast development
- ✅ Consistent design system
- ✅ Small production CSS
- ❌ Verbose className strings
- ❌ Learning curve

### 10.6 Lazy-Loaded Views

**Rationale:** Minimize initial bundle size. Users rarely visit all views in one session.

**Trade-offs:**
- ✅ Faster initial load
- ✅ Code splitting
- ❌ Slight delay when navigating to new view
- ❌ More complex build output

---

## 11. Implementation Guidelines for Other Frameworks

### 11.1 Vue.js Implementation

**Routing:** Use Vue Router with hash mode
```javascript
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/repositories', component: Repositories },
    // ...
  ]
});
```

**State:** Use Pinia or Composition API with `provide/inject`

**Renderers:** Implement `FormatRenderer` interface with Vue components returning VNodes

### 11.2 Angular Implementation

**Routing:** Use Angular Router with `useHash: true`
```typescript
RouterModule.forRoot(routes, { useHash: true })
```

**State:** Use RxJS BehaviorSubjects for contexts

**Renderers:** Implement `FormatRenderer` interface with Angular components using `ViewContainerRef`

### 11.3 Svelte Implementation

**Routing:** Use `svelte-spa-router` with hash-based routing

**State:** Use Svelte stores for contexts

**Renderers:** Implement `FormatRenderer` interface returning Svelte component instances

### 11.4 Framework-Agnostic Principles

1. **Separation of Concerns:** Keep rendering logic separate from data fetching
2. **Dual Mapping:** Always maintain both raw and rendered mappings for enrichments
3. **Ephemeral Content:** Never mutate original content; generate virtual content for rendering
4. **Registry Pattern:** Use a registry for format renderers to enable extensibility
5. **AST-Based Rendering:** Parse structured formats (Markdown, YAML) into ASTs before rendering
6. **Block Mapping:** Map raw lines to rendered blocks for accurate enrichment positioning

---

## 12. Performance Considerations

### 12.1 Virtual Scrolling

**Library:** `@tanstack/react-virtual`

**Use Case:** Large file lists, long documents

**Implementation:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 35,
});
```

### 12.2 Memoization

**Pattern:** Use `useMemo` for expensive computations

```typescript
const contentType = useMemo(() => 
  detectContentType(filename, fileContent),
  [filename, fileContent]
);

const parseResult = useMemo(() => 
  renderer?.parse(fileContent, contentType, prDiffData),
  [renderer, fileContent, contentType, prDiffData]
);
```

### 12.3 Lazy Loading

- Tree nodes: Load children on expand
- Views: Code-split with `React.lazy()`
- Images: Use `loading="lazy"` attribute

### 12.4 Debouncing

**Use Case:** Search input, auto-save

```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => performSearch(query), 300),
  []
);
```

---

## 13. Testing Strategy

### 13.1 Unit Tests

**Framework:** Jest + React Testing Library

**Coverage:**
- Content type detection
- Format renderers (parse + render)
- Enrichment mapping
- API client error handling

### 13.2 Integration Tests

**Framework:** Playwright

**Coverage:**
- Navigation flows
- File viewer with enrichments
- Comment creation and resolution
- Mode switching

### 13.3 E2E Tests

**Framework:** Playwright

**Coverage:**
- Login → Browse repository → View file → Add comment → Logout

---

## 14. Accessibility

### 14.1 Keyboard Navigation

- Tab through sidebar tree
- Arrow keys to expand/collapse folders
- Enter to navigate to file
- Escape to close modals

### 14.2 Screen Reader Support

- ARIA labels on interactive elements
- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- Alt text for icons

### 14.3 Color Contrast

- WCAG AA compliance
- Sufficient contrast for all text
- Color not sole indicator (use icons + text)

---

## 15. Browser Support

**Minimum Versions:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Polyfills:** None required (modern browsers only)
