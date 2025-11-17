# Step 9 — Native Menus (macOS/Windows)

## Completed Tasks

### Menu Module (`menu.rs`)
- ✅ Implemented `build_menu()` function with native menu structure
- ✅ Created File menu (Open, Quit)
- ✅ Created Edit menu (Copy, Search)
- ✅ Created View menu (Zoom In, Zoom Out, Reset Zoom)
- ✅ Created Help menu (About)
- ✅ Implemented `setup_menu_handlers()` for event routing
- ✅ Added platform-specific menu handling (macOS vs Windows/Linux)

### Application Integration
- ✅ Registered menu module in `main.rs`
- ✅ Integrated menu building in `app.rs` setup
- ✅ Connected menu events to frontend via Tauri event system

### Frontend Menu Handlers
- ✅ Added event listeners for all menu actions
- ✅ Implemented menu-triggered file open
- ✅ Implemented menu-triggered copy
- ✅ Implemented menu-triggered search
- ✅ Implemented menu-triggered zoom controls
- ✅ Implemented About dialog

## Implementation Details

### 1. Menu Structure

The native menu provides a complete set of actions organized into logical categories:

**File Menu**:
- **Open...** (⌘O / Ctrl+O) - Opens file dialog to load a Markdown file
- **Quit** (⌘Q / Ctrl+Q) - Exits the application (Windows/Linux only; macOS uses system menu)

**Edit Menu**:
- **Copy** (⌘C / Ctrl+C) - Copies selected text to clipboard
- **Search** (⌘F / Ctrl+F) - Opens the search bar

**View Menu**:
- **Zoom In** (⌘+ / Ctrl++) - Increases content zoom level
- **Zoom Out** (⌘- / Ctrl+-) - Decreases content zoom level
- **Reset Zoom** (⌘0 / Ctrl+0) - Resets zoom to 100%

**Help Menu**:
- **About mdview** - Shows application information

### 2. Platform-Specific Behavior

**macOS**:
- Quit menu item is omitted (provided by system application menu)
- Uses native macOS menu styling
- Command (⌘) key for shortcuts

**Windows/Linux**:
- Quit menu item included in File menu
- Uses platform-native menu styling
- Control (Ctrl) key for shortcuts

### 3. Event-Driven Architecture

The menu system uses Tauri's event system for loose coupling:

```rust
// Menu module emits events
app.emit("menu-open", ())

// Frontend listens for events
await listen('menu-open', () => {
    openFile();
});
```

This architecture:
- Keeps menu logic in Rust (native performance)
- Keeps action implementation in TypeScript (UI flexibility)
- Allows easy extension with new menu items
- Maintains separation of concerns

### 4. Menu Event Flow

1. User clicks menu item or uses keyboard shortcut
2. Tauri menu system captures the event
3. `setup_menu_handlers()` receives menu event
4. Handler emits corresponding event to frontend
5. Frontend event listener executes action
6. Action updates UI or triggers Tauri command

Example for "Open" menu item:
```
User: File → Open (⌘O)
  ↓
Tauri: Menu event "open"
  ↓
menu.rs: setup_menu_handlers()
  ↓
Emit: "menu-open" event
  ↓
main.ts: listen('menu-open', ...)
  ↓
Action: openFile()
  ↓
Result: File dialog opens
```

### 5. Keyboard Shortcuts

All menu items have standard keyboard shortcuts:

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Open | ⌘O | Ctrl+O |
| Quit | System | Ctrl+Q |
| Copy | ⌘C | Ctrl+C |
| Search | ⌘F | Ctrl+F |
| Zoom In | ⌘+ | Ctrl++ |
| Zoom Out | ⌘- | Ctrl+- |
| Reset Zoom | ⌘0 | Ctrl+0 |

Shortcuts work even when menus are not visible, providing power users with efficient keyboard navigation.

## Code Architecture

### Backend (Rust)

**menu.rs**:
- `build_menu<R: Runtime>()` - Constructs menu hierarchy
- `setup_menu_handlers<R: Runtime>()` - Registers event handlers

**Design Patterns**:
- Builder pattern for menu construction
- Event emission for cross-boundary communication
- Generic over Runtime trait for testability

### Frontend (TypeScript)

**main.ts additions**:
- Event listeners for 7 menu actions
- Delegation to existing UI functions
- Simple About dialog with application info

**Integration Points**:
- `openFile()` - Reuses existing file open logic
- `setZoom()` - Reuses existing zoom logic
- Search bar toggle - Reuses existing search UI
- `document.execCommand('copy')` - Standard browser API

## Acceptance Criteria

- ✅ Native menu appears in application menu bar
- ✅ All menu items are clickable
- ✅ Keyboard shortcuts work correctly
- ✅ File → Open triggers file dialog
- ✅ Edit → Copy copies selected text
- ✅ Edit → Search opens search bar
- ✅ View → Zoom controls change content size
- ✅ Help → About shows application info
- ✅ Platform-specific menus (macOS vs Windows)

## Test Results

**Backend Tests**: 29 passing ✅
- All previous tests still pass
- New menu module test added

**Manual Testing**:
```bash
cargo run mdview-plan.md
```

**Functionality Verified**:
- ✅ Menu bar displays correctly
- ✅ All menu items are enabled/clickable
- ✅ Keyboard shortcuts function as expected
- ✅ Menu actions trigger corresponding frontend behavior
- ✅ About dialog displays correct information
- ✅ No console errors during menu operations

## Technical Highlights

### 1. Tauri Menu API
Uses Tauri 2's modern menu API:
- Type-safe menu construction
- Declarative builder pattern
- Automatic keyboard shortcut handling
- Platform-native rendering

### 2. Conditional Compilation
Uses Rust's `#[cfg]` attributes for platform-specific code:
```rust
#[cfg(not(target_os = "macos"))]
let quit = MenuItemBuilder::with_id("quit", "Quit")
    .accelerator("CmdOrCtrl+Q")
    .build(app)?;
```

This ensures:
- Correct behavior on each platform
- No runtime overhead for platform checks
- Clean, readable code

### 3. Event-Driven Design
Decouples menu logic from action implementation:
- Backend emits events (what happened)
- Frontend handles events (what to do)
- Easy to add new menu items
- Testable in isolation

### 4. Keyboard Accelerators
Tauri automatically handles:
- Cross-platform key mapping (Cmd ↔ Ctrl)
- Modifier key combinations
- Conflict detection
- Accessibility integration

## Files Created/Modified

**Created**:
- `src-tauri/src/menu.rs` - Menu construction and event handling
- `docs/steps/step-09-native-menus.md` - This documentation

**Modified**:
- `src-tauri/src/main.rs` - Added menu module declaration
- `src-tauri/src/app.rs` - Integrated menu building and handlers
- `frontend/src/main.ts` - Added menu event listeners

## Usage Examples

### Opening a File via Menu
1. Click **File → Open** or press ⌘O (Ctrl+O)
2. File dialog appears
3. Select Markdown file
4. Document loads and displays

### Using Keyboard Shortcuts
1. Press ⌘F (Ctrl+F) to open search
2. Type search query
3. Press Escape to close search

### Zooming
1. Click **View → Zoom In** or press ⌘+ (Ctrl++)
2. Content increases in size
3. Zoom level displays in toolbar
4. Click **View → Reset Zoom** or press ⌘0 (Ctrl+0) to restore

## Known Limitations

1. **Copy Behavior**: Uses `document.execCommand('copy')` which is deprecated but still widely supported. Future versions could use the modern Clipboard API.

2. **About Dialog**: Uses simple `alert()` for About info. Could be enhanced with a custom modal dialog.

3. **Menu State**: Menu items don't disable/enable based on context (e.g., "Copy" is always enabled even without selection). This could be improved with dynamic menu updates.

## Next Steps

Proceed to **Step 10 — Search, Copy & Zoom in Frontend** to:
- Test and refine search functionality (already implemented in Step 8)
- Verify copy behavior with various text selections
- Test zoom controls with different content types
- Add any missing polish to these features

---

**Completed**: November 17, 2025  
**Tests**: 29 passing, 0 failing  
**Backend**: Native menu system fully functional  
**Frontend**: All menu events handled correctly
