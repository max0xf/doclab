# Left Menu Navigation Modes Design

## Overview
This document outlines the design and architecture for the Left Menu (Sidebar) in Cyber Wiki, introducing two distinct navigation modes: **Developer Mode** and **Document Mode** (PMs Mode).

The goal is to provide a tailored experience based on user persona, allowing developers to see the exact repository file structure (GitHub-like) and PMs/document readers to see a clean, human-readable hierarchy of documentation (Confluence-like).

## 1. Mode Switching Mechanism
Users need a way to switch between Developer and Document modes.

**Selected Approach: Contextual Dropdown (Per-Repository)**
* **Location:** Inside the sidebar, next to the "Selected Repository" name.
* **UI Element:** A view switcher dropdown or toggle icon (e.g., `real/cyber-repo [▼ View: Document]`).
* **Behavior:** Allows users to set different default views for different repositories. This preference should be persisted in the user's settings so that returning to a repository remembers the preferred view mode.

## 2. Layout & UI Design

### Shared Sidebar Elements
* **Top Section (Compact):** "Favorites" and "Recent" sections will be rendered as collapsible accordions to save vertical space. They default to closed if the list is long or when a repository is selected.
* **Selected Repository:** Prominently displays the current repository name.
* **Repository Actions:** Items like "Pull Requests" and "Comments" will be removed from the sidebar entirely. These will be relocated to top-level tabs in the main content area (similar to GitHub's Code | Pull Requests | Issues tabs) to free up sidebar space for navigation trees.

### Developer Mode (GitHub-like)
* **Purpose:** Raw, technical view of the repository.
* **File Tree:** Directly underneath the repository name, renders the complete directory and file structure (e.g., `src`, `.github`, `package.json`).
* **Icons:** Uses standard technical file and folder icons based on extensions.

### Document Mode (Confluence-like)
* **Purpose:** Clean, reading-optimized view of documentation.
* **Document Tree:** 
    * Hides all non-document files (e.g., `.ts`, `.json`, `.py`).
    * Replaces raw filenames with human-readable titles.
    * Uses generic "Page" icons instead of technical file extension icons.
* **Folder Handling (Folder-as-Page):** If a folder contains a main document (like `README.md` or `index.md`), the folder itself acts as a clickable page (the parent document) rather than just an empty directory toggle.

## 3. Document Mode Configuration (File-to-Title Mapping)
The system needs a way to determine which files are "documents" and what their display titles should be.

**Selected Approach: Smart Defaults + Code-First Config**

### Smart Defaults (Zero-Config)
By default, repositories should "just work" in Document Mode without any manual setup.
* **Scanning:** Automatically scan the repository for `.md` and `.mdx` files.
* **Title Extraction:** 
    1. Parse the first `# H1` tag in the markdown file to use as the title.
    2. Fallback: If no H1 exists, format the filename (e.g., `api_guideline.md` -> "Api Guideline").
* **Performance Consideration:** Extracting titles from all markdown files on-the-fly could be slow. This should leverage the **Enrichment Pipeline** to asynchronously scan files when a repo is indexed/updated, caching the extracted titles (H1 or formatted filename) in the database.

### Code-First Config (Overrides)
Developers can override the smart defaults by committing a configuration file (e.g., `.cyberwiki.yml` or similar) to the repository root.
* **Purpose:** Gives repository owners control over complex documentation structures.
* **Configurable Parameters:**
    * `includePaths`: Specify exact folders to show in Document Mode (e.g., `["/docs", "/architecture"]`).
    * `documentExtensions`: Allow other file types if needed.
    * `titleStrategy`: Explicitly define how to extract titles (e.g., `frontmatter_title`, `first_h1`, `filename`).

## Implementation Phases
1. **UI Refactoring:** Update the Layout component to implement the Contextual Dropdown, compact Favorites/Recent, remove Repository Actions, and create placeholder components for the new File/Document trees.
2. **Backend Configuration Parsing:** Implement logic to detect and parse the repository configuration file.
3. **Backend Enrichment Pipeline:** Implement the async title extraction (H1/filename fallback) and caching mechanism.
4. **Frontend Tree Rendering:** Build and integrate the recursive React components to render the raw File Tree and the human-readable Document Tree based on backend API responses.
