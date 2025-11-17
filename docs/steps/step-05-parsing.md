# Step 5 — Markdown Parsing & TOC Extraction

## Completed Tasks

### Dependencies Added
- ✅ Added `comrak = "0.30"` to Cargo.toml
- ✅ Integrated comrak for CommonMark-compliant Markdown parsing

### Implementation

#### 1. Markdown to HTML Conversion (`parser.rs`)

**Function**: `markdown_to_html(markdown: &str) -> String`

**Features Enabled**:
- ✅ **Tables** - GitHub-style table syntax
- ✅ **Strikethrough** - `~~text~~` support
- ✅ **Task Lists** - `- [ ]` and `- [x]` checkboxes
- ✅ **Autolinks** - Automatic URL detection
- ✅ **Heading IDs** - Automatic anchor ID generation
- ✅ **Footnotes** - Reference-style footnotes
- ✅ **Description Lists** - Definition list syntax
- ✅ **Safe Mode** - XSS prevention (unsafe HTML filtered)

**Safety**:
- `unsafe_` mode disabled - prevents XSS attacks
- Tag filtering enabled - sanitizes dangerous HTML
- Safe for rendering user-provided Markdown

**Tests** (8 tests, all passing):
- Basic heading rendering
- Paragraph rendering
- Multiple heading levels
- Table support
- Strikethrough formatting
- Code block rendering
- Safe mode XSS prevention
- Heading ID generation

#### 2. TOC Extraction (`toc.rs`)

**Function**: `extract_toc(markdown: &str) -> Vec<TocItem>`

**Implementation Strategy**:
- Parses Markdown into AST using comrak
- Recursively traverses AST to find heading nodes
- Extracts text content from heading children
- Generates URL-safe IDs from heading text
- Captures line numbers for navigation

**Helper Functions**:
- `extract_headings()` - Recursive AST traversal
- `extract_text()` - Collects text from heading node
- `collect_text()` - Recursive text collection
- `generate_id()` - Creates URL-safe anchor IDs

**ID Generation Rules**:
- Converts to lowercase
- Alphanumeric characters preserved
- Whitespace → `-` (single dash)
- Special characters → `_`
- Collapses consecutive dashes
- Trims leading/trailing dashes and underscores

**Examples**:
- `"Hello World"` → `"hello-world"`
- `"Test & Demo"` → `"test-_-demo"`
- `"Multiple   Spaces"` → `"multiple-spaces"`

**Tests** (8 tests, all passing):
- Single heading extraction
- Multiple heading levels
- Headings with formatting (bold, italic)
- Empty document (no headings)
- Mixed content (text + headings)
- Code in headings
- Line number tracking
- ID generation validation

#### 3. MarkdownDocument Integration (`mod.rs`)

**New Method**: `MarkdownDocument::from_file()`

**Signature**:
```rust
pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, loader::MdLoadError>
```

**Integration Flow**:
1. Load file content via `loader::load_markdown_file()`
2. Parse Markdown to HTML via `parser::markdown_to_html()`
3. Extract TOC via `toc::extract_toc()`
4. Create MarkdownDocument with all data

**Benefits**:
- Single method for complete document loading
- All processing happens in one call
- Error handling from loader propagates
- Ready for use in Tauri commands

## Test Results

All 26 tests passing ✅:

```bash
cargo test --package mdview
```

**Test Breakdown**:
- Loader tests: 4 passing
- Parser tests: 8 passing
- TOC tests: 8 passing
- Document tests: 4 passing
- Integration: 2 passing

## Acceptance Criteria

- ✅ `comrak` dependency added
- ✅ `markdown_to_html()` implemented with extensions
- ✅ `extract_toc()` implemented with AST traversal
- ✅ `MarkdownDocument::from_file()` integrates all components
- ✅ Comprehensive test coverage
- ✅ Safe HTML rendering (XSS prevention)
- ✅ All tests pass

## Technical Highlights

### 1. CommonMark Compliance
Using comrak ensures strict adherence to CommonMark spec while supporting popular extensions (tables, strikethrough, task lists).

### 2. Security
Safe mode prevents XSS attacks by filtering dangerous HTML tags and attributes. This is critical for viewing untrusted Markdown files.

### 3. AST-Based TOC Extraction
Rather than regex parsing HTML, we traverse the comrak AST directly:
- More reliable
- Captures source positions
- Handles nested formatting correctly

### 4. ID Generation
The `generate_id()` function creates GitHub-compatible anchor IDs:
- Lowercase normalization
- Dash-separated words
- Special character handling
- Consistent with common Markdown renderers

### 5. Line Number Tracking
TOC items include line numbers from the source, enabling:
- Jump-to-line functionality (future)
- Better debugging
- Source-to-rendered mapping

## Dependencies Summary

**comrak v0.30.0**:
- **License**: BSD-2-Clause
- **Purpose**: CommonMark parsing with extensions
- **Features**: Safe HTML, tables, strikethrough, task lists, footnotes
- **Size**: ~3 MB with dependencies

This dependency will be documented in `THIRD_PARTY_LICENSES.md` during Step 13.

## Usage Examples

### Basic Parsing
```rust
use mdview::md::parser::markdown_to_html;

let html = markdown_to_html("# Hello\n\nWorld");
println!("{}", html);
// Output: <h1 id="hello">Hello</h1>\n<p>World</p>
```

### TOC Extraction
```rust
use mdview::md::toc::extract_toc;

let markdown = "# Title\n## Subtitle\n### Section";
let toc = extract_toc(markdown);

for item in toc {
    println!("Level {}: {} (id: {})", item.level, item.text, item.id);
}
```

### Complete Document Loading
```rust
use mdview::md::MarkdownDocument;

match MarkdownDocument::from_file("README.md") {
    Ok(doc) => {
        println!("Loaded: {}", doc.path);
        println!("Headings: {}", doc.toc.len());
        println!("HTML size: {} bytes", doc.html_content.len());
    }
    Err(e) => eprintln!("Error: {}", e),
}
```

## Next Steps

Proceed to **Step 6 — Tauri App Setup, State, Commands** to:
- Create application state management
- Implement Tauri commands (`open_document`, `reload_document`, etc.)
- Expose backend functionality to frontend
- Enable IPC communication

---

**Completed**: November 17, 2025  
**Tests**: 26 passing, 0 failing  
**Lines of Code**: ~400 (including tests and documentation)
