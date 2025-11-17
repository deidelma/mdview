# Step 6 — Tauri App Setup, State, Commands

## Completed Tasks

### Application State (`state.rs`)
- ✅ Created `AppState` struct with thread-safe state management
- ✅ Implemented `Mutex`-wrapped fields for concurrent access
- ✅ State includes current document and zoom factor

### Tauri Commands (`commands.rs`)
- ✅ Implemented `open_document` command
- ✅ Implemented `reload_document` command
- ✅ Implemented `set_zoom_factor` command
- ✅ Implemented `get_zoom_factor` command
- ✅ Added `CommandError` type for error responses
- ✅ Added unit tests for validation logic

### App Integration (`app.rs`)
- ✅ Registered all commands with Tauri
- ✅ Initialized application state
- ✅ Set up Tauri builder with proper configuration

### Supporting Files
- ✅ Created placeholder frontend dist directory
- ✅ Created application icons (png, icns, ico)
- ✅ Updated module structure in main.rs

## Implementation Details

### 1. Application State

**Structure**:
```rust
pub struct AppState {
    pub current_document: Mutex<Option<MarkdownDocument>>,
    pub zoom_factor: Mutex<f64>,
}
```

**Features**:
- Thread-safe via `Mutex` wrappers
- Shared across all Tauri commands
- Default zoom factor: 1.0 (100%)
- Document state optional (None when no file loaded)

**Usage Pattern**:
```rust
let mut doc = state.current_document.lock().unwrap();
*doc = Some(new_document);
```

### 2. Tauri Commands

#### `open_document(path: String, state: State<AppState>)`
- Loads Markdown file from specified path
- Parses content and extracts TOC
- Updates application state
- Returns `MarkdownDocument` or error
- **Async**: Yes
- **Error Handling**: Converts `MdLoadError` to `CommandError`

**Frontend Usage**:
```typescript
const doc = await invoke('open_document', { path: '/path/to/file.md' });
```

#### `reload_document(state: State<AppState>)`
- Reloads current document from disk
- Fails if no document loaded
- Preserves current file path
- **Async**: Yes
- **Error Handling**: Returns error if no document loaded

**Frontend Usage**:
```typescript
const doc = await invoke('reload_document');
```

#### `set_zoom_factor(factor: f64, state: State<AppState>)`
- Sets zoom level for document view
- Validates range: 0.5 to 3.0 (50% to 300%)
- Updates state
- Returns new zoom factor or error
- **Async**: Yes

**Frontend Usage**:
```typescript
const zoom = await invoke('set_zoom_factor', { factor: 1.5 });
```

#### `get_zoom_factor(state: State<AppState>)`
- Returns current zoom factor
- **Async**: Yes
- **Returns**: Result<f64, CommandError>

**Frontend Usage**:
```typescript
const zoom = await invoke('get_zoom_factor');
```

### 3. Error Handling

**CommandError Structure**:
```rust
#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub message: String,
}
```

**Conversion from MdLoadError**:
- Automatic conversion via `From` trait
- Preserves error message and context
- Serializable for frontend consumption

**Error Examples**:
- File not found: `"File not found: /path/to/file.md"`
- Invalid UTF-8: `"Invalid UTF-8 encoding in file: /path/to/file.md"`
- Invalid zoom: `"Zoom factor must be between 0.5 and 3.0, got 5.0"`
- No document: `"No document is currently loaded"`

### 4. App Configuration

**Builder Pattern**:
```rust
tauri::Builder::default()
    .manage(AppState::new())
    .invoke_handler(tauri::generate_handler![
        commands::open_document,
        commands::reload_document,
        commands::set_zoom_factor,
        commands::get_zoom_factor,
    ])
    .run(tauri::generate_context!())
```

**Components**:
- `.manage()` - Registers shared state
- `.invoke_handler()` - Registers command handlers
- `.run()` - Starts application with context

## Test Results

All 28 tests passing ✅:

```bash
cargo test --package mdview
```

**Test Breakdown**:
- Command tests: 2 passing (error conversion, validation)
- Loader tests: 4 passing
- Parser tests: 8 passing
- TOC tests: 8 passing
- Document tests: 4 passing
- Integration: 2 passing

**Note**: Async command tests require Tauri runtime context and are better suited for integration tests. Unit tests focus on validation logic and error handling.

## Acceptance Criteria

- ✅ Commands callable from frontend (when app runs)
- ✅ State management thread-safe
- ✅ All commands registered in app.rs
- ✅ Error handling comprehensive
- ✅ Tests validate core logic
- ✅ Application compiles and runs

## Technical Highlights

### 1. Thread Safety
Using `Mutex` ensures safe concurrent access to shared state:
- Multiple commands can access state simultaneously
- Lock acquired only when needed
- Automatic lock release via RAII

### 2. Async Commands
All commands are async to:
- Prevent blocking the main thread
- Enable concurrent command execution
- Follow Tauri best practices

**Requirement**: Async commands with `State` parameter must return `Result`

### 3. State Management Pattern
```rust
// Acquire lock
let mut data = state.field.lock().unwrap();

// Modify data
*data = new_value;

// Lock automatically released when `data` goes out of scope
```

### 4. Command Registration
Using `tauri::generate_handler!` macro:
- Type-safe command registration
- Automatic serialization/deserialization
- Error handling integration

## Integration Points

These commands provide the backend API for:
- **Step 7**: CLI argument parsing (initial file load)
- **Step 8**: Frontend UI (invoke commands from JavaScript)
- **Step 9**: Native menus (trigger commands from menu items)
- **Step 10**: Frontend features (search, zoom, reload)

## Usage Examples

### From Frontend (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Open a document
try {
    const doc = await invoke('open_document', { 
        path: '/Users/user/document.md' 
    });
    console.log('Loaded:', doc.path);
    console.log('Headings:', doc.toc.length);
    renderDocument(doc);
} catch (error) {
    console.error('Failed to load:', error);
}

// Reload current document
const reloaded = await invoke('reload_document');

// Zoom controls
await invoke('set_zoom_factor', { factor: 1.5 }); // 150%
const currentZoom = await invoke('get_zoom_factor');
```

### State Access Pattern (Backend)

```rust
#[tauri::command]
async fn my_command(state: State<'_, AppState>) -> Result<(), CommandError> {
    // Read state
    let doc = state.current_document.lock().unwrap();
    if let Some(document) = doc.as_ref() {
        println!("Current document: {}", document.path);
    }
    drop(doc); // Release lock
    
    // Modify state
    let mut zoom = state.zoom_factor.lock().unwrap();
    *zoom = 2.0;
    
    Ok(())
}
```

## Files Created/Modified

**Created**:
- `frontend/dist/index.html` - Placeholder frontend
- `src-tauri/icons/*.png, *.icns, *.ico` - Application icons

**Modified**:
- `src-tauri/src/state.rs` - Application state implementation
- `src-tauri/src/commands.rs` - Tauri command handlers
- `src-tauri/src/app.rs` - App initialization and registration
- `src-tauri/src/main.rs` - Added commands and state modules
- `src-tauri/Cargo.toml` - Added tokio dev-dependency

## Next Steps

Proceed to **Step 7 — CLI Argument Parsing (Initial File Loading)** to:
- Parse command-line arguments
- Load file specified on command line
- Emit event to frontend with initial document
- Enable `mdview somefile.md` usage pattern

---

**Completed**: November 17, 2025  
**Tests**: 28 passing, 0 failing  
**Commands Implemented**: 4 (open, reload, set_zoom, get_zoom)
