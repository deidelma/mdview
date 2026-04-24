# Copilot Instructions for `mdview`

## Build, test, and lint commands

Run from repository root unless noted:

```bash
# Install frontend dependencies
npm --prefix frontend install

# Build frontend bundle
npm --prefix frontend run build

# Run the app (Tauri backend + frontend dev server via tauri.conf)
cargo run -p mdview -- [path/to/file.md]

# Run all Rust tests
cargo test -p mdview

# Run a single Rust test by name
cargo test -p mdview test_extract_toc_single_heading

# Rust formatting check (used as lint/format gate)
cargo fmt --all -- --check
```

There is no dedicated frontend lint/test script in `frontend/package.json`; backend tests are the main automated suite.

## High-level architecture

`mdview` is a Rust + Tauri desktop app with a vanilla TypeScript frontend:

1. **Rust backend (`src-tauri/src/`)** owns file I/O, markdown parsing, TOC extraction, app/window state, file history, and native menus.
2. **Frontend (`frontend/src/`)** renders HTML, TOC, search, zoom UI, and handles keyboard/toolbar interactions.
3. **Bridge** is Tauri commands + window events:
   - Frontend invokes commands (`open_document`, `reload_document`, zoom/history commands).
   - Backend emits events (`document-loaded`, `document-load-error`, `menu-*`) that frontend listens to.

Important flow details:

- Markdown parsing and TOC extraction happen in Rust (`md/parser.rs`, `md/toc.rs`) and are returned as a `MarkdownDocument`.
- App state is window-scoped (`AppState.current_documents` keyed by window label), so multi-window behavior is intentional.
- Single-instance relaunch forwards file paths to the running instance; drag-and-drop markdown files opens new viewer windows.
- File history is persisted as JSON in the app config directory (`history.json`), with validation/removal of missing files.

## Key conventions in this repository

1. **Keep frontend/backend event contracts stable.**  
   Menu IDs in Rust (`menu.rs`) map directly to emitted `menu-*` events consumed in `frontend/src/main.ts`.

2. **Keep heading ID generation synchronized between parser and TOC extraction.**  
   `md/parser.rs` enables `header_ids`, and `md/toc.rs` uses `Anchorizer`; tests assert TOC IDs match rendered HTML IDs.

3. **Maintain matching markdown extension support in both layers.**  
   Rust launch filtering (`launch.rs`) and frontend open dialog filters (`main.ts`) should stay aligned (`md`, `markdown`, `mdown`, `mkd`, `mdx`).

4. **Preserve per-window document state semantics.**  
   Commands that read/write current document should use the active `WebviewWindow` label; do not treat document state as global.

5. **Navigation history updates are failure-aware.**  
   `navigate_previous`/`navigate_next` capture and roll back history index on load failure; preserve this rollback behavior when changing navigation.

6. **Link handling intentionally rewrites anchors before click handling.**  
   Frontend moves external/local links into `data-*` attributes and removes `href` to prevent default Tauri/webview navigation interception.
