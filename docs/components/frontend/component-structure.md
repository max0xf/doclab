# Frontend Component Structure

## Overview
Components are organized by functionality into logical folders for better maintainability.

## Folder Structure

### `/auth`
Authentication-related components
- `LoginPage.tsx` - Login form and authentication UI

### `/layout`
Main application layout
- `Layout.tsx` - App shell with sidebar, header, and main content area

### `/main-view`
Main content area components (file viewer and related)
- `MainView.tsx` - Main content container with file tree and viewer
- `FileViewer.tsx` - File content display with enrichments
- `FileViewerHeader.tsx` - File viewer toolbar and actions
- `PRBanner.tsx` - Pull request information banner
- `ViewModeSwitcher.tsx` - Toggle between view/edit modes
- `ConflictResolutionWidget.tsx` - UI for resolving enrichment conflicts

### `/spaces`
Space management components
- `CreateSpaceModal.tsx` - Modal for creating new spaces
- `EditSpaceModal.tsx` - Modal for editing space settings
- `SpaceTree.tsx` - Tree view of space pages

#### `/spaces/file-mapping`
File mapping configuration sub-components
- `FileMappingConfiguration.tsx` - Main file mapping config UI
- `FileMappingConfigPanel.tsx` - Configuration panel
- `FileMappingPreview.tsx` - Preview of file mappings
- `FileTree.tsx` - File tree component for mapping

### `/content-renderers`
Content rendering components for different file types
- `PlainTextContentRenderer.tsx` - Renders layered virtual content as plain text
- `PlainTextContentWidget.tsx` - Plain text content widget
- `MarkdownContentWidget.tsx` - Markdown content widget

### `/virtual-content`
Virtual content system (layered enrichment rendering)
- `VirtualContentBuilder.ts` - Builds layered virtual content from enrichments
- `virtualContentTypes.ts` - Type definitions for virtual content
- `enrichmentCategories.ts` - Enrichment category definitions
- `types.ts` - Shared types for file viewer

### `/enrichments`
Enrichment display components
- `EnrichmentPanel.tsx` - Main enrichment panel (comments, diffs, etc.)
- `EnrichmentMarkers.tsx` - Visual markers for enrichments in code
- `Comment.tsx` - Comment display component

### `/right-panel`
Right sidebar panel and its tabs
- `CommentsPanel.tsx` - Comments list and management
- `CommentsTab.tsx` - Comments tab content
- `ChangesTab.tsx` - Changes/diffs tab content
- `DiffViewer.tsx` - Diff visualization component

### `/common`
Shared utility components
- `SmartLoadingIndicator.tsx` - Loading spinner with smart timing
- `ViewLoadingFallback.tsx` - Fallback UI for lazy-loaded views

## Removed Components

### Deleted (Legacy/Unused)
- `Enrichments/` folder - Old enrichment system (replaced by new virtual content)
- `renderers/` folder - Old renderer system (CodeRenderer, MarkdownRenderer, PlainTextRenderer)
- `FileEditor.tsx` - Unused editor component
- `TiptapEditor.tsx` - Unused rich text editor
- `FileContentRenderer.tsx` - Legacy content renderer

## Import Patterns

Components should be imported from their new locations:

```typescript
// Auth
import LoginPage from '@/components/auth/LoginPage';

// Layout
import Layout from '@/components/layout/Layout';

// Main View
import MainView from '@/components/main-view/MainView';
import FileViewer from '@/components/main-view/FileViewer';

// Spaces
import CreateSpaceModal from '@/components/spaces/CreateSpaceModal';
import FileMappingConfiguration from '@/components/spaces/file-mapping/FileMappingConfiguration';

// Content Renderers
import { PlainTextContentRenderer } from '@/components/content-renderers/PlainTextContentRenderer';

// Virtual Content
import { VirtualContentBuilder } from '@/components/virtual-content/VirtualContentBuilder';

// Enrichments
import EnrichmentPanel from '@/components/enrichments/EnrichmentPanel';

// Right Panel
import CommentsPanel from '@/components/right-panel/CommentsPanel';

// Common
import SmartLoadingIndicator from '@/components/common/SmartLoadingIndicator';
```

## Next Steps

1. Update all import paths throughout the codebase
2. Run linter to catch any broken imports
3. Test all components to ensure they work after reorganization
