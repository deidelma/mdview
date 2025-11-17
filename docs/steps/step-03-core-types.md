# Step 3 — Define Core Domain Types (Markdown & TOC)

## Completed Tasks

### Core Types Implementation
- ✅ Created `src-tauri/src/md/` module structure
- ✅ Defined `MarkdownDocument` type with serialization support
- ✅ Defined `TocItem` type with serialization support
- ✅ Implemented file loader with UTF-8 validation
- ✅ Added comprehensive unit tests
- ✅ Added error handling types

### Module Structure

```
src-tauri/src/md/
├── mod.rs          # Core types: MarkdownDocument, TocItem
├── loader.rs       # File loading with MdLoadError
├── parser.rs       # Placeholder for Step 5
└── toc.rs          # Placeholder for Step 5
```

### Type Definitions

#### MarkdownDocument
```rust
pub struct MarkdownDocument {
    pub path: String,           // Original file path
    pub raw_content: String,    // Raw Markdown content
    pub html_content: String,   // Parsed HTML content
    pub toc: Vec<TocItem>,      // Extracted table of contents
}
```

**Methods**:
- `new()` - Creates a new instance with all fields
- `empty()` - Creates an empty document

**Features**:
- Implements `Serialize` and `Deserialize` for Tauri IPC
- Implements `Debug` and `Clone` for development convenience

#### TocItem
```rust
pub struct TocItem {
    pub level: u8,                  // Heading level (1-6)
    pub text: String,               // Heading text
    pub id: String,                 // Anchor ID for linking
    pub line_number: Option<usize>, // Optional line number
}
```

**Methods**:
- `new()` - Creates a TOC item without line number
- `with_line_number()` - Creates a TOC item with line number

**Features**:
- Implements `Serialize`, `Deserialize`, `PartialEq`, `Eq`
- Supports comparison for testing

### File Loader Implementation

#### MdLoadError
Error enum for file loading operations:
- `FileNotFound(String)` - File doesn't exist
- `IoError(io::Error)` - I/O operation failed
- `InvalidUtf8(String)` - File contains invalid UTF-8

#### load_markdown_file()
Loads and validates Markdown files:
- Checks file existence
- Reads file contents
- Validates UTF-8 encoding
- Returns descriptive errors

### Dependencies Added
- `thiserror = "1"` - For error type derivation
- `tempfile = "3"` - For testing (dev-dependency)

### Tests Implemented

**MarkdownDocument Tests**:
- ✅ `test_markdown_document_new()` - Create with data
- ✅ `test_markdown_document_empty()` - Create empty
- ✅ `test_serialization()` - JSON serialization/deserialization

**TocItem Tests**:
- ✅ `test_toc_item_new()` - Create without line number
- ✅ `test_toc_item_with_line_number()` - Create with line number
- ✅ `test_toc_item_equality()` - Test equality comparison

**Loader Tests**:
- ✅ `test_load_valid_file()` - Load valid UTF-8 file
- ✅ `test_load_nonexistent_file()` - Handle missing file
- ✅ `test_load_invalid_utf8()` - Handle invalid encoding
- ✅ `test_load_empty_file()` - Handle empty file

## Acceptance Criteria
- ✅ Types compile successfully
- ✅ All unit tests pass
- ✅ Error handling implemented
- ✅ Serialization/deserialization works for Tauri IPC
- ✅ Documentation comments added

## Test Results
Run tests with:
```bash
cargo test --package mdview
```

All tests should pass.

## Notes

1. **Placeholder Modules**: `parser.rs` and `toc.rs` contain placeholder implementations that will be completed in Step 5 when the `comrak` dependency is added.

2. **Error Handling**: Using `thiserror` crate for ergonomic error type definitions with automatic `Error` trait implementation.

3. **Serialization**: Both core types implement Serde traits, making them ready for use with Tauri commands (which require JSON serialization).

4. **Testing Strategy**: Using `tempfile` crate to create temporary files for testing file operations, ensuring tests are isolated and repeatable.

## Next Steps
Proceed to **Step 4 — Implement Markdown Loader (File Handling)** to complete the file loading implementation (already done as part of this step) or continue to **Step 5 — Markdown Parsing & TOC Extraction** to add `comrak` and implement the actual parsing logic.

---

**Completed**: November 17, 2025
