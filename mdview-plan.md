# mdview Development Plan

## Overview
This document presents a complete, sequential, engineering‑grade development plan for **mdview**, a lightweight cross‑platform Markdown viewer built using **Rust + Tauri**.

The plan is structured into fourteen well‑defined implementation steps. Each step includes goals, tasks, testing/acceptance criteria, and documentation requirements. A coding agent (e.g., Codex GPT‑5.1) can follow this plan directly to implement the project.

---

## Step 1 — Bootstrap Tauri Project & Repository

### Goals
- Create the initial Tauri application structure.
- Establish repository scaffolding.

### Tasks
1. Initialize Git repository.
2. Scaffold a Tauri app using `cargo tauri init` or template.
3. Create documentation skeleton:
   - `README.md`
   - `docs/architecture.md`
   - `docs/design-decisions.md`
   - `docs/steps/step-01-bootstrap.md`
4. Add `.gitignore`.

### Acceptance
- `cargo tauri dev` launches a blank window.

---

## Step 2 — Licensing & Third-Party License Scaffolding

### Goals
- Add MIT license.
- Add file listing third‑party dependencies.

### Tasks
- Add `LICENSE` (MIT, © 2025 David Eidelman).
- Create `THIRD_PARTY_LICENSES.md`.
- Document in `step-02-licensing.md`.

### Acceptance
- License files exist and appear in repository root.

---

## Step 3 — Define Core Domain Types (Markdown & TOC)

### Goals
- Establish `MarkdownDocument` and `TocItem` types.

### Tasks
- Create `src-tauri/src/md/` module.
- Add:
  - `MarkdownDocument`
  - `TocItem`
- Add basic unit tests.

### Acceptance
- Types compile, tests pass.

---

## Step 4 — Implement Markdown Loader (File Handling)

### Goals
- Provide UTF‑8 file loading with error types.

### Tasks
- Implement `load_markdown_file()` in `loader.rs`.
- Add error enum `MdLoadError`.
- Add unit tests.

### Acceptance
- Loader correctly reads UTF‑8 files.
- Errors handled cleanly.

---

## Step 5 — Markdown Parsing & TOC Extraction

### Goals
- Implement markdown → HTML conversion.
- Implement heading → TOC extraction.

### Tasks
- Add `comrak` dependency.
- Implement `markdown_to_html()` in `parser.rs`.
- Implement `extract_toc()` in `toc.rs`.
- Integrate into `MarkdownDocument::from_file`.

### Acceptance
- Tests verify HTML output and TOC extraction.

---

## Step 6 — Tauri App Setup, State, Commands

### Goals
- Provide backend API for the frontend.

### Tasks
- Add shared application state (`AppState`).
- Implement Tauri commands:
  - `open_document`
  - `reload_document`
  - `set_zoom_factor`
  - `get_zoom_factor`
- Register commands in `app.rs`.

### Acceptance
- Commands callable from frontend.

---

## Step 7 — CLI Argument Parsing (Initial File Loading)

### Goals
- Allow `mdview somefile.md` to open file at startup.

### Tasks
- Parse CLI arguments in `main.rs` / `setup`.
- Load that file and update state.
- Notify frontend via event.

### Acceptance
- CLI invocation loads file at startup.

---

## Step 8 — Frontend Layout (Sidebar, Content, Toolbar)

### Goals
- Implement UI skeleton.

### Tasks
- Build layout: sidebar (TOC) + main content.
- Add toolbar for Open, Search, Zoom.
- Add basic CSS styling.
- Render HTML into `markdown-container`.

### Acceptance
- Dev build shows operational layout.

---

## Step 9 — Native Menus (macOS/Windows)

### Goals
- Provide OS-native menu system.

### Tasks
- Create menu in `menu.rs`.
- Handle menu actions:
  - File → Open | Quit
  - Edit → Copy | Search
  - View → Zoom controls
  - Help → About
- Emit events to frontend.

### Acceptance
- Menu items trigger expected behavior.

---

## Step 10 — Search, Copy & Zoom in Frontend

### Goals
- Implement UI behavior for core features.

### Tasks
- Implement text search (highlight, next/prev).
- Add copy support via `document.execCommand` or clipboard API.
- Implement zoom scaling in frontend.

### Acceptance
- Search highlights text.
- Zoom visibly increases/decreases font size.

---

## Step 11 — External Links & TOC Enhancements

### Goals
- Ensure correct link behavior.

### Tasks
- Intercept clicks in markdown content.
- Open external links via system browser.
- Improve TOC indentation, active section highlighting.

### Acceptance
- External links open correctly.
- TOC navigation works smoothly.

---

## Step 12 — Packaging & Distribution

### Goals
- Configure production builds.

### Tasks
- Configure `tauri.conf.json`.
- Document platform-specific packaging steps.
- Optional: Add CI workflow.

### Acceptance
- `cargo tauri build` produces binaries.

---

## Step 13 — Third‑Party License Summary

### Goals
- Ensure all dependencies are properly listed.

### Tasks
- Inspect `Cargo.lock` and frontend lockfile.
- Populate `THIRD_PARTY_LICENSES.md`.

### Acceptance
- File lists all runtime dependencies.

---

## Step 14 — Polishing & Full Documentation

### Goals
- Create contributor-friendly documentation.

### Tasks
- Expand `README.md`.
- Fill in architecture and design decision docs.
- Write step documentation in `docs/steps/`.

### Acceptance
- README + docs present a clear overview for new contributors.

---

## Summary

Following these fourteen steps produces:

- Fully functional cross‑platform Markdown viewer
- Native menus
- TOC
- Search, zoom, copy, external link handling
- Executable distributions
- Complete documentation + licensing

This plan is suitable for direct implementation by automated coding agents or human developers.

[www.google.com][def]

[def]: https://www.google.com