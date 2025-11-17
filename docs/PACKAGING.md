# Packaging & Distribution

This document describes how to package and distribute mdview for different platforms.

## Overview

mdview uses Tauri's built-in bundler to create platform-specific installers and packages. The configuration is in `src-tauri/tauri.conf.json`.

## Prerequisites

1. **Complete a release build** (see [BUILDING.md](BUILDING.md))
2. **Install Tauri CLI** (optional, for advanced bundling):
   ```bash
   cargo install tauri-cli
   ```

## Platform-Specific Packaging

### macOS

#### Application Bundle (.app)

The `.app` bundle is the standard macOS application format.

**Build:**
```bash
cd src-tauri
cargo tauri build --target aarch64-apple-darwin   # Apple Silicon
cargo tauri build --target x86_64-apple-darwin    # Intel
```

**Output:**
- `target/release/bundle/macos/mdview.app`

**Universal Binary** (both architectures):
```bash
cargo tauri build --target universal-apple-darwin
```

#### Disk Image (.dmg)

DMG files provide a drag-and-drop installer experience.

**Build:**
```bash
cargo tauri build
```

**Output:**
- `target/release/bundle/dmg/mdview_0.1.0_aarch64.dmg`
- `target/release/bundle/dmg/mdview_0.1.0_x64.dmg`

**Customization:**
Edit `src-tauri/tauri.conf.json` to customize DMG appearance:
```json
{
  "bundle": {
    "macOS": {
      "dmg": {
        "background": "path/to/background.png",
        "windowSize": { "width": 660, "height": 400 }
      }
    }
  }
}
```

#### Code Signing (Optional)

For distribution outside the App Store, sign with a Developer ID:

```bash
export APPLE_CERTIFICATE="Developer ID Application: Your Name (TEAM_ID)"
export APPLE_CERTIFICATE_PASSWORD="your-cert-password"
cargo tauri build
```

For App Store distribution, use App Store distribution certificate.

#### Notarization (Required for macOS 10.15+)

```bash
# After building
xcrun notarytool submit \
  target/release/bundle/dmg/mdview_*.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# Staple the notarization
xcrun stapler staple target/release/bundle/dmg/mdview_*.dmg
```

### Linux

#### AppImage (Recommended)

AppImage is a universal Linux package format that works on most distributions.

**Build:**
```bash
cargo tauri build
```

**Output:**
- `target/release/bundle/appimage/mdview_0.1.0_amd64.AppImage`

**Usage:**
```bash
chmod +x mdview_*.AppImage
./mdview_*.AppImage [file.md]
```

#### Debian Package (.deb)

For Debian, Ubuntu, and derivatives.

**Build:**
```bash
cargo tauri build --bundles deb
```

**Output:**
- `target/release/bundle/deb/mdview_0.1.0_amd64.deb`

**Install:**
```bash
sudo dpkg -i mdview_*.deb
sudo apt-get install -f  # Fix dependencies if needed
```

#### RPM Package

For Fedora, RHEL, and derivatives.

**Build:**
```bash
cargo tauri build --bundles rpm
```

**Output:**
- `target/release/bundle/rpm/mdview-0.1.0-1.x86_64.rpm`

**Install:**
```bash
sudo rpm -i mdview-*.rpm
```

### Windows

#### MSI Installer

Standard Windows installer format.

**Build:**
```bash
cargo tauri build
```

**Output:**
- `target\release\bundle\msi\mdview_0.1.0_x64_en-US.msi`

**Code Signing (Optional):**
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "path/to/key.pfx"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "password"
cargo tauri build
```

#### NSIS Installer (Alternative)

For more customization options:

```bash
cargo tauri build --bundles nsis
```

**Output:**
- `target\release\bundle\nsis\mdview_0.1.0_x64-setup.exe`

## Version Management

Update version in multiple files:

1. **Cargo.toml:**
   ```toml
   [package]
   version = "0.1.0"
   ```

2. **tauri.conf.json:**
   ```json
   {
     "version": "0.1.0"
   }
   ```

3. **package.json:**
   ```json
   {
     "version": "0.1.0"
   }
   ```

## Release Checklist

Before creating a release:

- [ ] Update version numbers in all files
- [ ] Update `CHANGELOG.md`
- [ ] Run all tests: `cargo test`
- [ ] Build for all target platforms
- [ ] Test installers on clean machines
- [ ] Update `THIRD_PARTY_LICENSES.md`
- [ ] Create Git tag: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`

## Continuous Integration (Optional)

### GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, ubuntu-latest, windows-latest]
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.1-dev \
            build-essential curl wget file \
            libssl-dev libayatana-appindicator3-dev librsvg2-dev
      
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm install
      
      - name: Build
        run: |
          cd src-tauri
          cargo tauri build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.platform }}
          path: |
            target/release/bundle/**/*
```

## Distribution Channels

### GitHub Releases

1. Create release on GitHub
2. Upload platform-specific installers
3. Include release notes from `CHANGELOG.md`

### Homebrew (macOS)

Create a Homebrew formula:

```ruby
class Mdview < Formula
  desc "Lightweight Markdown viewer"
  homepage "https://github.com/deidelma/mdview"
  url "https://github.com/deidelma/mdview/archive/v0.1.0.tar.gz"
  sha256 "..."
  
  depends_on "rust" => :build
  depends_on "node" => :build
  
  def install
    cd "frontend" do
      system "npm", "install"
      system "npm", "run", "build"
    end
    
    cd "src-tauri" do
      system "cargo", "build", "--release"
      bin.install "target/release/mdview"
    end
  end
end
```

### AUR (Arch Linux)

Create a PKGBUILD file for the Arch User Repository.

### Cargo (Rust developers)

Publish to crates.io:
```bash
cargo publish
```

## File Associations

To register mdview as a Markdown file handler, add to `tauri.conf.json`:

```json
{
  "bundle": {
    "linux": {
      "deb": {
        "files": {
          "/usr/share/applications/mdview.desktop": "mdview.desktop"
        }
      }
    },
    "macOS": {
      "documentTypes": [
        {
          "name": "Markdown",
          "role": "Viewer",
          "iconPath": "icons/icon.icns",
          "extensions": ["md", "markdown", "mdown", "mkd", "mdx"]
        }
      ]
    }
  }
}
```

## Troubleshooting

### Build fails with missing dependencies
- Ensure all platform dependencies are installed (see [BUILDING.md](BUILDING.md))

### Code signing errors
- Verify certificates are valid and not expired
- Check environment variables are set correctly

### Large binary size
- Enable LTO and strip in `Cargo.toml` (already configured)
- Use `cargo bloat` to analyze size: `cargo install cargo-bloat`

## Resources

- [Tauri Bundler Documentation](https://v2.tauri.app/reference/cli/)
- [Signing macOS Apps](https://developer.apple.com/documentation/xcode/notarizing-macos-software-before-distribution)
- [Creating Windows Installers](https://learn.microsoft.com/en-us/windows/win32/msi/windows-installer-portal)
