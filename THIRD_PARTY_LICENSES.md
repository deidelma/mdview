# Third-Party Licenses

This document lists all third-party dependencies used in **mdview** and their respective licenses.

## Rust Dependencies (Backend)

| Component | Version | License | Source |
|-----------|---------|---------|--------|
| tauri | 2.x | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| tauri-build | 2.x | Apache-2.0 OR MIT | https://github.com/tauri-apps/tauri |
| serde | 1.x | Apache-2.0 OR MIT | https://github.com/serde-rs/serde |
| serde_json | 1.x | Apache-2.0 OR MIT | https://github.com/serde-rs/json |

*Note: Additional dependencies will be added as the project evolves (e.g., `comrak` for Markdown parsing).*

## JavaScript/TypeScript Dependencies (Frontend)

*To be populated when frontend dependencies are finalized.*

| Component | Version | License | Source |
|-----------|---------|---------|--------|
| (pending) | - | - | - |

## Build Tool Dependencies

| Component | Version | License | Source |
|-----------|---------|---------|--------|
| TypeScript | 5.x | Apache-2.0 | https://github.com/microsoft/TypeScript |
| Vite | 5.x | MIT | https://github.com/vitejs/vite |

---

## License Texts

### Apache License 2.0

```
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

[Full Apache 2.0 license text would be included here]
```

### MIT License

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Notes

- This file will be updated as dependencies are added or updated during development.
- Version numbers reflect the major versions used; exact versions are specified in `Cargo.lock` and `package-lock.json`.
- All dependencies use OSI-approved open source licenses compatible with mdview's MIT license.
- For exact dependency versions and transitive dependencies, see:
  - Rust: `Cargo.lock` in `src-tauri/`
  - Frontend: `package-lock.json` in `frontend/`

**Last Updated**: November 17, 2025
