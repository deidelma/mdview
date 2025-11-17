# Building mdview

This document describes how to build mdview from source for development and production.

## Prerequisites

### Required Tools

- **Rust**: 1.70 or later
  - Install via [rustup](https://rustup.rs/): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js**: 18 or later
  - Install via [nvm](https://github.com/nvm-sh/nvm) or download from [nodejs.org](https://nodejs.org/)
- **npm**: Included with Node.js

### Platform-Specific Dependencies

#### macOS
No additional dependencies required. Xcode Command Line Tools are recommended:
```bash
xcode-select --install
```

#### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Linux (Fedora/RHEL)
```bash
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

#### Windows
- **Visual Studio**: 2019 or later with C++ build tools
- **WebView2**: Usually pre-installed on Windows 10/11
  - If needed: [Download WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Development Build

### 1. Clone the Repository
```bash
git clone https://github.com/deidelma/mdview.git
cd mdview
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Run Development Build
```bash
cd src-tauri
cargo run [file.md]
```

Or use the development script with hot-reload:
```bash
# Terminal 1: Start frontend dev server
cd frontend
npm run dev

# Terminal 2: Run Tauri in dev mode
cd src-tauri
cargo run mdview-plan.md
```

## Production Build

### Build Release Binary

```bash
# Build frontend
cd frontend
npm run build

# Build Rust release binary from project root
cd ..
cargo build --release
```

The release binary will be located at:
- **macOS/Linux**: `target/release/mdview`
- **Windows**: `target\release\mdview.exe`

### Platform-Specific Builds

#### macOS Application Bundle

For macOS, you can create a proper `.app` bundle using Tauri's bundler. First, install the Tauri CLI:

```bash
cargo install tauri-cli
```

Then build the bundle:

```bash
cd src-tauri
cargo tauri build
```

The `.app` bundle and `.dmg` installer will be in:
```
src-tauri/target/release/bundle/macos/mdview.app
src-tauri/target/release/bundle/dmg/mdview_0.1.0_*.dmg
```

#### Linux Package

Build AppImage or Debian package:

```bash
cargo tauri build
```

Output locations:
- **AppImage**: `src-tauri/target/release/bundle/appimage/mdview_*.AppImage`
- **Debian**: `src-tauri/target/release/bundle/deb/mdview_*.deb`

#### Windows Installer

Build MSI installer:

```bash
cargo tauri build
```

Output location:
- **MSI**: `src-tauri\target\release\bundle\msi\mdview_*.msi`

## Build Configuration

The build is configured via `src-tauri/tauri.conf.json`:

- **productName**: Application display name
- **version**: Application version (keep in sync with `Cargo.toml`)
- **identifier**: Unique app identifier (reverse domain notation)
- **bundle.icon**: Application icons
- **bundle.category**: macOS App Store category
- **bundle.targets**: Build targets (`all`, `dmg`, `deb`, `appimage`, `msi`, etc.)

## Testing the Build

### Run Tests
```bash
cd src-tauri
cargo test
```

### Run the Binary
```bash
# From project root
./target/release/mdview [file.md]

# macOS .app bundle (if built with tauri CLI)
open target/release/bundle/macos/mdview.app --args [file.md]
```

## Optimizations

### Binary Size

The release binary is optimized for size. Current configuration in `Cargo.toml`:

```toml
[profile.release]
opt-level = "z"     # Optimize for size
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
strip = true        # Strip symbols
```

Typical binary sizes:
- **macOS**: ~8-10 MB
- **Linux**: ~10-12 MB
- **Windows**: ~8-10 MB

### Build Speed

For faster development builds, you can disable optimizations:

```bash
cargo build  # Debug build (faster compilation)
```

## Troubleshooting

### Frontend Build Fails
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Rust Build Fails
```bash
cd src-tauri
cargo clean
cargo build --release
```

### Missing Icons
Icons are located in `src-tauri/icons/`. Ensure all required sizes exist:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

### WebView Issues on Linux
If WebView2 isn't working:
```bash
sudo apt install webkit2gtk-4.1
```

## Next Steps

- See [PACKAGING.md](PACKAGING.md) for distribution instructions
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines
- See [README.md](../README.md) for usage documentation
