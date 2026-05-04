# mdview

A lightweight cross-platform Markdown viewer and editor built with Rust and Tauri.

Release-specific summaries belong in [RELEASE_NOTES.md](RELEASE_NOTES.md).

## Overview

**mdview** is a fast, native Markdown viewer and editor that provides:
- Clean, distraction-free reading experience
- Split-view editing with live preview
- Table of Contents (TOC) navigation
- Full-text search with highlighting
- Preferences for theme mode and palette selection
- Persistent zoom controls
- Session restore for open windows and documents
- Native OS menus (macOS/Windows/Linux)
- External link handling
- Copy functionality

This project is being developed as an experiment in LLM-assisted coding.  The code, tests, and documentation were implemented 
using LLMs.  The plan was created using GPT5.1 from OpenAI. The code was primarily generated using Claude Sonnet 4.5 from Anthropic.

## Features

- **Native Performance**: Built with Rust and Tauri for minimal resource usage
- **Cross-Platform**: Runs on macOS, Windows, and Linux
- **Read And Edit**: Toggle between preview-only and split edit/preview modes with live Markdown rendering
- **TOC Navigation**: Automatically generated table of contents from Markdown headings
- **Search**: Find text within documents with next/previous navigation
- **Preferences And Themes**: Choose light, dark, or automatic appearance and switch between Default, IntelliJ Light, and IntelliJ Dark palettes
- **Persistent Zoom**: Zoom level is saved and restored across launches
- **Session Restore**: Reopen prior windows, geometry, and disk-backed documents when launching without a file argument
- **Working Directory Memory**: Open and save dialogs reuse the most recent document directory when possible
- **Native Menus**: OS-native menu system integration, including a Preferences entry with `Cmd+,` on macOS

## Installation

### Pre-built Binaries (Not Implemented)

Download the latest release for your platform from the [Releases page](https://github.com/deidelma/mdview/releases).

### From Source

Requirements:
- Rust 1.70+ (install via [rustup](https://rustup.rs/))
- Node.js 18+
- Platform-specific dependencies (see [docs/BUILDING.md](docs/BUILDING.md))

```bash
# Clone the repository
git clone https://github.com/deidelma/mdview.git
cd mdview

# Install frontend dependencies
cd frontend
npm install
cd ..

# Build release binary
cd src-tauri
cargo build --release

# The binary will be at: target/release/mdview (or mdview.exe on Windows)
```

For detailed build instructions, see [docs/BUILDING.md](docs/BUILDING.md).

For packaging and distribution, see [docs/PACKAGING.md](docs/PACKAGING.md).

## Usage

```bash
# Open a Markdown file
mdview path/to/document.md

# Or launch and use File → Open from the menu
mdview
```

Launching `mdview` without a file restores the previous session, including open windows and their disk-backed documents. Launching with a file opens that file instead of restoring the previous session.

On desktop platforms, you can also drop a Markdown file onto the `mdview` executable to open it. If `mdview` is already running, the dropped file opens in the existing window. When multiple files are dropped onto the executable at once, the first file is opened.

You can also drag Markdown files onto an already open mdview window. Each dropped Markdown file opens in its own new viewer window, leaving the original window unchanged.

Use Preferences to control appearance mode and palette:

- **Theme Mode**: Light, Dark, Automatic
- **Palettes**: Default, IntelliJ Light, IntelliJ Dark

Automatic mode follows the OS light/dark preference and uses the Default palette so appearance changes remain consistent.

### Keyboard Shortcuts

- **Cmd/Ctrl+O**: Open file
- **Cmd/Ctrl+S**: Save current file
- **Cmd/Ctrl+Shift+S**: Save current file as
- **Cmd/Ctrl+R**: Reload current file
- **Cmd/Ctrl+F**: Search
- **Cmd/Ctrl+E**: Toggle edit mode
- **Cmd/Ctrl++**: Zoom in
- **Cmd/Ctrl+-**: Zoom out
- **Cmd/Ctrl+0**: Reset zoom
- **Cmd/Ctrl+,**: Open Preferences
- **Cmd/Ctrl+Left**: Previous file in history
- **Cmd/Ctrl+Right**: Next file in history
- **Cmd/Ctrl+Q**: Quit

### Features

- Click any heading in the Table of Contents to jump to that section
- Use the search bar to find text (supports next/previous navigation)
- Toggle edit mode to update Markdown with a live preview beside the editor
- Save unsaved drafts directly to the launch path or use Save As to choose a new file name
- External links (http://, https://, www.) open in your system browser
- Internal links (#anchors) scroll smoothly to the target section

## Development

See [docs/architecture.md](docs/architecture.md) for architectural overview and [docs/design-decisions.md](docs/design-decisions.md) for design rationale.

Development follows the plan outlined in [mdview-plan.md](mdview-plan.md).

### Known Issues

- binary releases are not yet implemented
- **Windows Debug Build**: You may see a harmless error on exit: `Failed to unregister class Chrome_WidgetWin_0`. This is a known Chromium/WebView2 cleanup race condition and can be safely ignored.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Third-Party Licenses

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for licenses of dependencies.
