# Layered Virtual Content System

## Overview

The Layered Virtual Content system provides a clean architecture for rendering file content with multiple enrichments (PR diffs, commits, edits, comments). It separates content building from rendering and naturally detects conflicts.

## Architecture

```
Original Content + Enrichments
         ↓
  VirtualContentBuilder
         ↓
  LayeredVirtualContent
         ↓
  Content Renderer (PlainText, Markdown, etc.)
```

## Components

### 1. Enrichment Categories (`enrichmentCategories.ts`)

Defines enrichment types and categories matching the backend:

- **REFERENCE**: Enrichments that point to lines without modifying them
  - `comments`
  - `local_changes`

- **DIFF**: Enrichments that modify content by adding/removing lines
  - `pr_diff`
  - `commit`
  - `edit_session`
  - `diff`

### 2. Virtual Content Types (`virtualContentTypes.ts`)

#### VirtualLine
Represents a single line in the virtual content:
- `lineNumber`: Original line number
- `virtualLineNumber`: Sequential number in current layer
- `content`: The actual text
- `enrichments`: All enrichments applying to this line
- `sourceEnrichment`: The enrichment that created this line (for inserted lines)
- `isOriginalLine` / `isInsertedLine`: Line origin
- `diffType`: 'addition' | 'deletion' | 'modification'
- `hasConflict`: True if multiple enrichments conflict
- `layerIndex`: Which layer this line belongs to
- `previousLayerLine`: Maps to previous layer

#### VirtualContentLayer
Represents one layer in the content:
- `layerIndex`: 0 = original, 1+ = enrichment layers
- `enrichment`: The enrichment that created this layer
- `lines`: All lines in this layer

#### LayeredVirtualContent
The complete structure passed to renderers:
- `originalContent` / `originalLines`: Source content
- `layers`: All layers (0 = original, 1+ = enrichments)
- `finalLines`: Merged view from last layer
- `enrichments`: All enrichments
- `hasConflicts` / `conflictLines`: Conflict information
- `stats`: Statistics about the content

### 3. VirtualContentBuilder (`VirtualContentBuilder.ts`)

Builds layered virtual content from original content and enrichments.

**Algorithm:**
1. Create Layer 0 from original content
2. Sort diff enrichments by priority (pr_diff → commit → edit_session)
3. For each diff enrichment:
   - Create new layer by applying diffs to previous layer
   - Insert additions/deletions at hunk positions
   - Copy unchanged lines from previous layer
4. Apply reference enrichments (comments) to final layer
5. Detect conflicts by checking if multiple enrichments modified same lines

**Key Methods:**
- `build()`: Main entry point, returns LayeredVirtualContent
- `buildOriginalLayer()`: Creates layer 0
- `applyDiffEnrichment()`: Applies one diff to create new layer
- `processDiffHunk()`: Converts hunk to virtual lines
- `detectConflicts()`: Finds lines modified by 2+ enrichments

**Conflict Detection:**
Natural conflict detection: if line N has inserted content in multiple layers, it's a conflict.

### 4. PlainTextContentRenderer (`PlainTextContentRenderer.tsx`)

React component that renders LayeredVirtualContent as plain text.

**Features:**
- Two line numbers: original and virtual
- Color-coded diffs (green additions, red deletions)
- Enrichment badges (PR, Commit, Edit, Conflict, Comments)
- Click handlers for lines and enrichments

**Props:**
- `virtualContent`: LayeredVirtualContent to render
- `onLineClick`: Handler for line clicks
- `onEnrichmentClick`: Handler for enrichment badge clicks

## Usage Example

```typescript
import { VirtualContentBuilder } from './VirtualContentBuilder';
import { PlainTextContentRenderer } from './PlainTextContentRenderer';

// Build virtual content
const builder = new VirtualContentBuilder(
  originalContent,
  enrichments,
  {
    detectConflicts: true,
    enrichmentOrder: ['pr_diff', 'commit', 'edit_session'],
  }
);

const virtualContent = builder.build();

// Render
<PlainTextContentRenderer
  virtualContent={virtualContent}
  onLineClick={(lineNum) => console.log('Clicked line:', lineNum)}
  onEnrichmentClick={(id) => console.log('Clicked enrichment:', id)}
/>
```

## Benefits

1. **Separation of Concerns**: Building and rendering are separate
2. **Natural Conflict Detection**: Conflicts emerge from layer structure
3. **Extensible**: Easy to add new enrichment types
4. **Renderer Agnostic**: Same virtual content for PlainText, Markdown, etc.
5. **Traceable**: Each line knows its origin and transformations
6. **Debuggable**: Clear layer structure for troubleshooting

## Backend Integration

The system integrates with backend enrichment categories:

```
GET /api/enrichments/v1/enrichments/metadata/
```

Returns:
```json
{
  "comments": {"type": "comments", "category": "reference"},
  "pr_diff": {"type": "pr_diff", "category": "diff"},
  "commit": {"type": "commit", "category": "diff"},
  "edit_session": {"type": "edit_session", "category": "diff"}
}
```

## Next Steps

1. Update PlainTextContentWidget to use VirtualContentBuilder
2. Create MarkdownContentRenderer using same LayeredVirtualContent
3. Add enrichment priority configuration UI
4. Implement conflict resolution UI
5. Add layer visualization for debugging
