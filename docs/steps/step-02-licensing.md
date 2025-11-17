# Step 2 — Licensing & Third-Party License Scaffolding

## Completed Tasks

### License Files
- ✅ `LICENSE` file created with MIT License (© 2025 David Eidelman)
- ✅ `THIRD_PARTY_LICENSES.md` created with dependency listing structure

### License Details

#### Main Project License
- **Type**: MIT License
- **Copyright**: © 2025 David Eidelman
- **File**: `LICENSE`

The MIT License was chosen for its:
- Permissive nature allowing commercial and private use
- Compatibility with most open source dependencies
- Simplicity and wide adoption in the developer community

#### Third-Party Dependencies
Created `THIRD_PARTY_LICENSES.md` to track all external dependencies:

**Current Dependencies Listed**:
- **Tauri** (Apache-2.0 OR MIT) - Core application framework
- **serde** (Apache-2.0 OR MIT) - Serialization framework
- **serde_json** (Apache-2.0 OR MIT) - JSON support

**To Be Added**:
- `comrak` - Markdown parsing (will be added in Step 5)
- Frontend dependencies - TypeScript, Vite, etc.

### File Structure
```
THIRD_PARTY_LICENSES.md
├── Rust Dependencies (Backend)
├── JavaScript/TypeScript Dependencies (Frontend)
├── Build Tool Dependencies
├── License Texts (Apache 2.0, MIT)
└── Notes on maintenance
```

## Acceptance Criteria
- ✅ MIT License file exists in repository root
- ✅ Third-party licenses file created with initial dependencies
- ✅ File includes structure for future dependency additions
- ✅ Documentation notes maintenance procedures

## Implementation Notes

1. **License Compatibility**: All current dependencies use Apache-2.0 OR MIT licenses, which are compatible with mdview's MIT license.

2. **Maintenance**: The `THIRD_PARTY_LICENSES.md` file includes notes that it will be updated as dependencies are added. Step 13 of the plan will perform a comprehensive audit.

3. **Version Tracking**: The file references `Cargo.lock` and `package-lock.json` for exact dependency versions.

## Next Steps
Proceed to **Step 3 — Define Core Domain Types (Markdown & TOC)** to establish the foundational data structures for the application.

---

**Completed**: November 17, 2025