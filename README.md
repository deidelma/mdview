# mdview

A lightweight cross-platform Markdown viewer built with Rust and Tauri.

## Overview

**mdview** is a fast, native Markdown viewer that provides:
- Clean, distraction-free reading experience
- Table of Contents (TOC) navigation
- Full-text search with highlighting
- Zoom controls
- Native OS menus (macOS/Windows/Linux)
- External link handling
- Copy functionality

## Features

- **Native Performance**: Built with Rust and Tauri for minimal resource usage
- **Cross-Platform**: Runs on macOS, Windows, and Linux
- **TOC Navigation**: Automatically generated table of contents from Markdown headings
- **Search**: Find text within documents with next/previous navigation
- **Zoom**: Adjust text size for comfortable reading
- **Native Menus**: OS-native menu system integration

## Installation

### Pre-built Binaries

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

### Keyboard Shortcuts

- **Cmd/Ctrl+O**: Open file
- **Cmd/Ctrl+R**: Reload current file
- **Cmd/Ctrl+F**: Search
- **Cmd/Ctrl++**: Zoom in
- **Cmd/Ctrl+-**: Zoom out
- **Cmd/Ctrl+0**: Reset zoom
- **Cmd/Ctrl+Q**: Quit (macOS)

### Features

- Click any heading in the Table of Contents to jump to that section
- Use the search bar to find text (supports next/previous navigation)
- External links (http://, https://, www.) open in your system browser
- Internal links (#anchors) scroll smoothly to the target section

## Development

See [docs/architecture.md](docs/architecture.md) for architectural overview and [docs/design-decisions.md](docs/design-decisions.md) for design rationale.

Development follows the plan outlined in [mdview-plan.md](mdview-plan.md).

### Known Issues

- **Windows Debug Build**: You may see a harmless error on exit: `Failed to unregister class Chrome_WidgetWin_0`. This is a known Chromium/WebView2 cleanup race condition and can be safely ignored.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Third-Party Licenses

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for licenses of dependencies.
