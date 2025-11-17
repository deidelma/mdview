# Step 4 — Implement Markdown Loader (File Handling)

## Completed Tasks

### File Loader Implementation
- ✅ Implemented `load_markdown_file()` function in `src-tauri/src/md/loader.rs`
- ✅ Created `MdLoadError` enum for comprehensive error handling
- ✅ Added UTF-8 validation
- ✅ Implemented unit tests for all scenarios

## Implementation Details

### Function: `load_markdown_file()`

**Signature**:
```rust
pub fn load_markdown_file<P: AsRef<Path>>(path: P) -> Result<String, MdLoadError>
```

**Features**:
- Generic path parameter accepting anything convertible to `Path`
- Three-stage validation:
  1. File existence check
  2. File system read operation
  3. UTF-8 encoding validation
- Descriptive error messages with file paths

**Process Flow**:
1. Convert path to `Path` reference
2. Check if file exists → `FileNotFound` if not
3. Read file as bytes → `IoError` on failure
4. Validate UTF-8 encoding → `InvalidUtf8` if invalid
5. Return validated string content

### Error Type: `MdLoadError`

Comprehensive error enum using `thiserror`:

```rust
#[derive(Debug, thiserror::Error)]
pub enum MdLoadError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
    
    #[error("Invalid UTF-8 encoding in file: {0}")]
    InvalidUtf8(String),
}
```

**Error Variants**:
- `FileNotFound(String)` - File doesn't exist at the specified path
- `IoError(io::Error)` - Filesystem I/O operation failed (permissions, disk errors, etc.)
- `InvalidUtf8(String)` - File contains non-UTF-8 bytes (binary files, wrong encoding)

**Benefits**:
- User-friendly error messages with context
- Automatic `Error` trait implementation via `thiserror`
- Conversion from `io::Error` via `#[from]` attribute

### Tests Implemented

All test cases pass ✅:

1. **`test_load_valid_file()`**
   - Creates temporary file with Markdown content
   - Verifies successful loading
   - Checks content integrity

2. **`test_load_nonexistent_file()`**
   - Attempts to load non-existent file
   - Verifies `FileNotFound` error is returned
   - Tests error message format

3. **`test_load_invalid_utf8()`**
   - Creates file with invalid UTF-8 bytes (0xFF, 0xFE, 0xFD)
   - Verifies `InvalidUtf8` error is returned
   - Ensures proper encoding validation

4. **`test_load_empty_file()`**
   - Tests edge case of empty file
   - Verifies empty string is returned successfully
   - No errors on zero-length files

### Testing Strategy

- Uses `tempfile` crate for isolated, repeatable tests
- No dependency on external files
- Tests all error paths and success path
- Edge cases covered (empty files, invalid encoding)

## Acceptance Criteria

- ✅ `load_markdown_file()` correctly reads UTF-8 files
- ✅ File existence is validated before reading
- ✅ Invalid UTF-8 encoding is detected and reported
- ✅ IO errors are properly propagated
- ✅ Error messages include file paths for debugging
- ✅ All unit tests pass
- ✅ Function is well-documented with examples

## Usage Example

```rust
use mdview::md::loader::load_markdown_file;

match load_markdown_file("document.md") {
    Ok(content) => {
        println!("Loaded {} bytes", content.len());
        // Process content...
    }
    Err(e) => {
        eprintln!("Failed to load file: {}", e);
    }
}
```

## Integration Points

This loader will be used by:
- Step 5: Markdown parsing (feeds content to parser)
- Step 6: Tauri commands (backend for `open_document` command)
- Step 7: CLI argument handling (initial file load)

## Technical Notes

1. **Path Generics**: Using `AsRef<Path>` allows the function to accept `&str`, `String`, `PathBuf`, etc.

2. **UTF-8 Requirement**: Markdown files must be UTF-8 encoded. This is a reasonable constraint as:
   - Markdown spec assumes UTF-8
   - Most modern editors default to UTF-8
   - Error message guides users to fix encoding issues

3. **Error Handling Philosophy**: Each error variant provides context (file path) to help users diagnose issues quickly.

4. **Performance**: Using `fs::read()` loads entire file into memory, which is appropriate for typical Markdown documents (< 10 MB).

## Next Steps

Proceed to **Step 5 — Markdown Parsing & TOC Extraction** to:
- Add `comrak` dependency
- Implement `markdown_to_html()` function
- Implement `extract_toc()` function
- Integrate loader with parser

---

**Completed**: November 17, 2025  
**Note**: This step was implemented concurrently with Step 3 as the loader is fundamental to the domain types.
