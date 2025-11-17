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

### From Source

Requirements:
- Rust (latest stable)
- Node.js 18+
- Platform-specific dependencies (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

```bash
# Clone the repository
git clone https://github.com/yourusername/mdview.git
cd mdview

# Install frontend dependencies
cd frontend
npm install
cd ..

# Run in development mode
cargo tauri dev

# Build for production
cargo tauri build
```

## Usage

```bash
# Open a Markdown file
mdview path/to/document.md

# Or use File → Open from the menu
```

## Development

See [docs/architecture.md](docs/architecture.md) for architectural overview and [docs/design-decisions.md](docs/design-decisions.md) for design rationale.

Development follows the plan outlined in [mdview-plan.md](mdview-plan.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Third-Party Licenses

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for licenses of dependencies.
