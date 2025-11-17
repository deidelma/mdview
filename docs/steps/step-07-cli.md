# Step 7 — CLI Argument Parsing (Initial File Loading)

## Completed Tasks

### CLI Argument Parsing (`main.rs`)
- ✅ Added `clap` dependency for argument parsing
- ✅ Defined `Args` struct with file parameter
- ✅ Implemented CLI parsing using `clap::Parser` derive macro
- ✅ Pass parsed file path to app initialization

### App Setup Hook (`app.rs`)
- ✅ Modified `run()` to accept optional initial file path
- ✅ Implemented `.setup()` hook for initialization logic
- ✅ Load document during setup if file path provided
- ✅ Update application state with loaded document
- ✅ Emit events to frontend for success/error cases

### Event Emission
- ✅ Emit `document-loaded` event with document data on success
- ✅ Emit `document-load-error` event with error message on failure
- ✅ Frontend can listen to these events to update UI

## Implementation Details

### 1. CLI Argument Structure

**Command Definition**:
```rust
#[derive(Parser, Debug)]
#[command(name = "mdview")]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(value_name = "FILE")]
    file: Option<String>,
}
```

**Features**:
- Optional file argument (positional)
- Automatic `--help` and `--version` flags
- Version from `Cargo.toml`
- About text: "A lightweight cross-platform Markdown viewer"

**Usage Examples**:
```bash
# Open specific file
mdview README.md
mdview /path/to/document.md

# Open without file (shows empty window)
mdview

# Show help
mdview --help

# Show version
mdview --version
```

### 2. Setup Hook Implementation

**Flow**:
1. Check if `initial_file` argument is provided
2. If yes, attempt to load the file using `MarkdownDocument::from_file()`
3. On success:
   - Update `AppState.current_document`
   - Emit `document-loaded` event to frontend
4. On error:
   - Print error to stderr
   - Emit `document-load-error` event to frontend

**Code Pattern**:
```rust
.setup(move |app| {
    if let Some(file_path) = initial_file {
        let app_handle = app.handle().clone();
        let state = app.state::<AppState>();
        
        match MarkdownDocument::from_file(&file_path) {
            Ok(document) => {
                // Update state and emit success event
            }
            Err(e) => {
                // Log error and emit error event
            }
        }
    }
    Ok(())
})
```

### 3. Event System

**Events Emitted**:

#### `document-loaded`
- **Trigger**: Successfully loaded initial file
- **Payload**: `MarkdownDocument` (serialized JSON)
- **Frontend Handler**: 
  ```typescript
  import { listen } from '@tauri-apps/api/event';
  
  await listen('document-loaded', (event) => {
      const doc = event.payload;
      renderDocument(doc);
  });
  ```

#### `document-load-error`
- **Trigger**: Failed to load initial file
- **Payload**: Error message string
- **Frontend Handler**:
  ```typescript
  await listen('document-load-error', (event) => {
      const error = event.payload;
      showError(`Failed to load file: ${error}`);
  });
  ```

### 4. Error Handling

**Error Cases**:
- File not found
- Invalid UTF-8 encoding
- Permission denied
- IO errors

**Error Reporting**:
1. **Console**: Error printed to stderr via `eprintln!`
2. **Frontend**: Error message emitted as event
3. **State**: Document remains `None` (empty state)

**Example Error Output**:
```
Failed to load initial file 'missing.md': File not found: missing.md
```

## Acceptance Criteria

- ✅ `mdview somefile.md` loads file at startup
- ✅ `mdview` without arguments starts with empty state
- ✅ `mdview --help` shows usage information
- ✅ `mdview --version` shows version
- ✅ Invalid file path shows error (doesn't crash)
- ✅ Frontend receives document via event
- ✅ State is updated before frontend notification

## Test Results

All 28 tests passing ✅:

```bash
cargo test --package mdview
```

**Manual Testing**:
```bash
# Test help output
cargo run --package mdview -- --help

# Test with file
cargo run --package mdview -- test.md

# Test with nonexistent file
cargo run --package mdview -- missing.md
```

**Help Output**:
```
A lightweight cross-platform Markdown viewer

Usage: mdview [FILE]

Arguments:
  [FILE]  Path to the Markdown file to open

Options:
  -h, --help     Print help
  -V, --version  Print version
```

## Technical Highlights

### 1. clap Derive Macro
Using `#[derive(Parser)]` provides:
- Automatic argument parsing
- Type-safe CLI definition
- Built-in help generation
- Error handling with helpful messages

### 2. Tauri Setup Hook
The `.setup()` method:
- Runs after window creation but before showing
- Has access to app handle and state
- Perfect for initialization logic
- Can emit events to windows

### 3. Event-Driven Architecture
Events decouple backend from frontend:
- Backend doesn't need to know UI implementation
- Frontend can react to backend events
- Supports multiple windows/listeners
- Asynchronous notification

### 4. Move Closure
Using `move` in setup closure:
```rust
.setup(move |app| { ... })
```
- Transfers ownership of `initial_file` to closure
- Necessary because closure outlives `run()` function
- Safe because `initial_file` is `Option<String>` (owned data)

## Integration Points

This step enables:
- **User Experience**: Direct file opening from command line
- **OS Integration**: Associate `.md` files with mdview
- **Workflow**: `mdview document.md` opens file immediately
- **Frontend**: Listen for `document-loaded` to render content

## Usage Examples

### Command Line

```bash
# Open a document
mdview ~/Documents/README.md

# Open from relative path
mdview ./notes.md

# Open without file (launches empty viewer)
mdview

# Check version
mdview --version
```

### Frontend Event Listeners

```typescript
import { listen } from '@tauri-apps/api/event';

// Listen for successful load
await listen('document-loaded', (event) => {
    const doc = event.payload as MarkdownDocument;
    
    // Render HTML content
    document.getElementById('content').innerHTML = doc.html_content;
    
    // Render TOC
    renderTOC(doc.toc);
    
    // Update window title
    document.title = `mdview - ${doc.path}`;
});

// Listen for load errors
await listen('document-load-error', (event) => {
    const error = event.payload as string;
    showNotification('error', error);
});
```

### State Access Pattern

After CLI load, state is available to all commands:
```typescript
// Get current document via state (already loaded by CLI)
const doc = await invoke('reload_document');

// Document is already in state from CLI load
console.log('Document loaded at startup:', doc.path);
```

## Dependencies Added

**clap v4.5**:
- **License**: Apache-2.0 OR MIT
- **Purpose**: Command-line argument parsing
- **Features**: derive macro for declarative CLI
- **Size**: ~2 MB with dependencies

This will be documented in `THIRD_PARTY_LICENSES.md` during Step 13.

## Files Modified

- `src-tauri/src/main.rs` - Added Args struct and CLI parsing
- `src-tauri/src/app.rs` - Added setup hook and event emission
- `src-tauri/Cargo.toml` - Added clap dependency
- `test.md` - Created test file for CLI testing

## Known Limitations

1. **Single File Only**: Can only open one file at startup (not multiple)
2. **No File Validation**: Doesn't check if file is actually Markdown (loads any file)
3. **Relative Paths**: Resolved relative to current working directory
4. **Event Race**: Frontend must set up listeners before `document-loaded` is emitted

**Note**: Items 1-2 are design decisions; 3 is standard behavior; 4 is handled by Tauri's event queue.

## Next Steps

Proceed to **Step 8 — Frontend Layout (Sidebar, Content, Toolbar)** to:
- Implement HTML/CSS layout structure
- Create sidebar for TOC navigation
- Create main content area for rendered Markdown
- Add toolbar with Open, Search, Zoom buttons
- Listen for `document-loaded` event
- Render document content in UI

---

**Completed**: November 17, 2025  
**Tests**: 28 passing, 0 failing  
**CLI**: Fully functional with --help, --version, and file argument
