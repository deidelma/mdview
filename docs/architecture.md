# Architecture

## Overview

**mdview** is a cross-platform Markdown viewer built using a hybrid architecture:
- **Backend**: Rust (via Tauri) for file I/O, Markdown processing, and native OS integration
- **Frontend**: TypeScript/HTML/CSS for UI rendering and user interactions

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (UI)                    │
│  TypeScript + HTML + CSS                            │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Layout     │  │  Search  │  │     TOC      │  │
│  │   Manager    │  │  Handler │  │   Navigator  │  │
│  └──────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                    Tauri Bridge
                         │
┌─────────────────────────────────────────────────────┐
│                 Backend (Rust/Tauri)                │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Commands   │  │   State  │  │     Menu     │  │
│  │   (API)      │  │  Manager │  │   Handler    │  │
│  └──────────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │           Markdown Module                    │  │
│  │  ┌──────────┐  ┌─────────┐  ┌────────────┐  │  │
│  │  │  Loader  │  │  Parser │  │ TOC Extract│  │  │
│  │  └──────────┘  └─────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                    File System
```

## Components

### Frontend

#### Layout Manager (`frontend/src/ui/layout.ts`)
- Manages sidebar (TOC) and main content area
- Handles responsive layout adjustments
- Coordinates UI component initialization

#### Search Handler (`frontend/src/ui/search.ts`)
- Implements in-page text search
- Highlights search results
- Provides next/previous navigation

#### TOC Navigator (`frontend/src/ui/toc.ts`)
- Renders table of contents from heading data
- Handles click navigation to sections
- Highlights active section

#### Main Application (`frontend/src/main.ts`)
- Application entry point
- Initializes UI components
- Sets up event listeners for backend communication

### Backend

#### Commands (`src-tauri/src/commands.rs`)
Tauri command handlers exposed to frontend:
- `open_document(path)` - Load and parse Markdown file
- `reload_document()` - Reload current document
- `set_zoom_factor(factor)` - Update zoom level
- `get_zoom_factor()` - Retrieve current zoom level

#### State Manager (`src-tauri/src/state.rs`)
Application state management:
- Current document path
- Parsed Markdown content
- Zoom factor
- Application settings

#### Menu Handler (`src-tauri/src/menu.rs`)
Native OS menu system:
- File menu (Open, Quit)
- Edit menu (Copy, Search)
- View menu (Zoom In/Out/Reset)
- Help menu (About)

#### Markdown Module (`src-tauri/src/md/`)

**Loader** (`loader.rs`)
- File I/O operations
- UTF-8 encoding validation
- Error handling

**Parser** (`parser.rs`)
- Markdown to HTML conversion (using `comrak`)
- Syntax extension support
- Safe HTML rendering

**TOC Extractor** (`toc.rs`)
- Extracts heading hierarchy
- Generates TOC data structure
- Provides navigation metadata

## Data Flow

### Document Loading
1. User opens file via CLI, menu, or command
2. Frontend invokes `open_document(path)` command
3. Backend loads file content
4. Backend parses Markdown → HTML
5. Backend extracts TOC structure
6. Backend updates application state
7. Backend returns HTML + TOC to frontend
8. Frontend renders content and TOC

### Search
1. User enters search term in UI
2. Frontend performs client-side search in rendered HTML
3. Frontend highlights matches
4. User navigates between matches with next/prev buttons

### Zoom
1. User triggers zoom via menu or commands
2. Frontend calls `set_zoom_factor(factor)`
3. Backend updates state
4. Frontend applies CSS transform to content

## Technology Stack

- **Rust**: Backend logic, file operations, Markdown processing
- **Tauri**: Cross-platform runtime, native APIs
- **TypeScript**: Type-safe frontend code
- **HTML/CSS**: UI rendering and styling
- **comrak**: Markdown parsing library (CommonMark + extensions)

## Design Principles

1. **Separation of Concerns**: Backend handles I/O and parsing; frontend handles rendering and UI
2. **Type Safety**: TypeScript in frontend, Rust in backend
3. **Performance**: Native code for heavy operations, minimal dependencies
4. **Cross-Platform**: Tauri provides platform abstraction
5. **Simplicity**: No complex frameworks, straightforward data flow

## Future Considerations

- Plugin system for Markdown extensions
- Theme customization
- Recent files list
- Document bookmarks
- Export to PDF/HTML