# Design Decisions

This document records key architectural and implementation decisions made during the development of **mdview**.

## Technology Choices

### Why Tauri?

**Decision**: Use Tauri instead of Electron or native frameworks.

**Rationale**:
- **Performance**: Rust backend provides near-native performance for file I/O and parsing
- **Bundle Size**: Significantly smaller than Electron (uses system WebView)
- **Resource Usage**: Lower memory footprint compared to Chromium-based solutions
- **Security**: Rust's memory safety + Tauri's security features
- **Cross-Platform**: Single codebase for macOS, Windows, Linux

**Tradeoffs**:
- Smaller ecosystem compared to Electron
- Requires platform-specific WebView (may have rendering inconsistencies)
- Steeper learning curve for developers unfamiliar with Rust

### Why Vanilla TypeScript (No Framework)?

**Decision**: Use vanilla TypeScript instead of React, Vue, or other frameworks.

**Rationale**:
- **Simplicity**: UI is relatively simple (sidebar + content area)
- **Performance**: No framework overhead for a document viewer
- **Bundle Size**: Smaller frontend bundle
- **Learning Curve**: Easier for contributors to understand

**Tradeoffs**:
- Manual DOM manipulation
- No built-in state management
- More boilerplate for complex UI (acceptable for this use case)

### Why comrak for Markdown Parsing?

**Decision**: Use `comrak` instead of `pulldown-cmark` or other parsers.

**Rationale**:
- **CommonMark Compliance**: Strict adherence to CommonMark spec
- **Extensions**: Supports tables, strikethrough, task lists
- **Safety**: Can sanitize unsafe HTML
- **Performance**: Fast C-based implementation with Rust bindings

**Alternatives Considered**:
- `pulldown-cmark`: Good performance but fewer extensions
- `markdown-rs`: Pure Rust but less mature

## Architectural Decisions

### Client-Side vs. Server-Side Search

**Decision**: Implement search on the frontend (client-side).

**Rationale**:
- **Performance**: No IPC overhead for each search operation
- **Responsiveness**: Instant feedback as user types
- **Simplicity**: Browser's native text search APIs

**Tradeoffs**:
- Cannot search across multiple documents
- Limited to what's currently rendered

### TOC Generation Strategy

**Decision**: Generate TOC in backend during parsing.

**Rationale**:
- **Single Parse**: Extract headings during Markdown→HTML conversion
- **Type Safety**: Rust struct for TOC data
- **Reusability**: TOC data available for other features (e.g., bookmarks)

**Alternative**: Frontend could parse rendered HTML headings
- Less efficient (double parsing)
- Less structured data

### State Management

**Decision**: Use Tauri's managed state for application state.

**Rationale**:
- **Thread Safety**: Rust's `Mutex` ensures safe concurrent access
- **Built-in**: Leverages Tauri's state management
- **Simple**: No need for external state library

**State Stored**:
- Current document path
- Parsed content (HTML + TOC)
- Zoom factor
- Application preferences

### Zoom Implementation

**Decision**: Implement zoom via CSS transform in frontend.

**Rationale**:
- **Performance**: No re-parsing or re-rendering
- **Smooth**: CSS transitions for zoom changes
- **Persistent**: Zoom factor stored in backend state

**Alternative**: Font-size adjustment
- Less flexible
- Harder to reset to baseline

### External Link Handling

**Decision**: Intercept link clicks and open external links in system browser.

**Rationale**:
- **Security**: Keep navigation within app minimal
- **User Expectation**: External links should open in browser
- **Implementation**: Use `window.open` with Tauri's shell API

**Tradeoffs**:
- Requires link interception logic
- Anchor links must be handled separately

## File Organization

### Monorepo Structure

**Decision**: Use workspace structure with `frontend/` and `src-tauri/`.

**Rationale**:
- **Separation**: Clear boundary between frontend and backend
- **Tauri Convention**: Follows Tauri's recommended structure
- **Independent Builds**: Frontend and backend can build independently

### Module Organization

**Decision**: Organize Rust code by feature (not by layer).

**Rationale**:
- `md/` module contains all Markdown-related functionality
- `commands.rs` for Tauri API surface
- `state.rs` for application state
- `menu.rs` for native menu handling

## Security Considerations

### HTML Sanitization

**Decision**: Use `comrak`'s safe mode to prevent XSS.

**Rationale**:
- Markdown files may contain arbitrary HTML
- Safe mode strips potentially dangerous tags/attributes

### File Access

**Decision**: Only allow opening files via explicit user action (menu/dialog).

**Rationale**:
- Prevents unauthorized file access
- Follows principle of least privilege

## Future-Proofing

### Plugin Architecture (Deferred)

**Decision**: No plugin system in v1.0.

**Rationale**:
- Adds complexity
- YAGNI (You Aren't Gonna Need It) - build when needed
- Can be added later without breaking changes

### Theme System (Deferred)

**Decision**: Single built-in theme initially.

**Rationale**:
- Reduces scope for v1.0
- Can add CSS variable-based theming later
- Most users expect system theme anyway

## Performance Targets

- **Startup Time**: < 1 second on modern hardware
- **File Load**: < 100ms for typical documents (< 1MB)
- **Search**: < 50ms for highlighting on typical documents
- **Memory**: < 50MB base + document size

## Accessibility (Future)

**Decision**: Basic accessibility in v1.0, enhanced in future versions.

**Initial Support**:
- Semantic HTML
- Keyboard navigation
- Screen reader compatible

**Future Enhancements**:
- High contrast mode
- Font size preferences
- Focus indicators

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2025