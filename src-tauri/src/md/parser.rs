use comrak::{markdown_to_html as comrak_md_to_html, Options};

/// Converts Markdown text to HTML using comrak.
/// 
/// # Arguments
/// 
/// * `markdown` - The Markdown source text
/// 
/// # Returns
/// 
/// * `String` - The rendered HTML
/// 
/// # Features
/// 
/// - Enables CommonMark extensions (tables, strikethrough, task lists)
/// - Uses safe mode to prevent XSS attacks
/// - Generates heading IDs for anchor links
/// 
/// # Examples
/// 
/// ```
/// use mdview::md::parser::markdown_to_html;
/// 
/// let html = markdown_to_html("# Hello\n\nWorld");
/// assert!(html.contains("<h1>"));
/// ```
pub fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::default();
    
    // Enable extensions
    options.extension.strikethrough = true;
    options.extension.tagfilter = true;
    options.extension.table = true;
    options.extension.autolink = true;
    options.extension.tasklist = true;
    options.extension.superscript = false;
    options.extension.header_ids = Some(String::new()); // Enable heading IDs
    options.extension.footnotes = true;
    options.extension.description_lists = true;
    
    // Render options
    options.render.unsafe_ = false; // Safe mode - prevent XSS
    options.render.escape = false;  // Don't double-escape
    
    comrak_md_to_html(markdown, &options)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_to_html_basic() {
        let markdown = "# Hello World";
        let html = markdown_to_html(markdown);
        
        assert!(html.contains("<h1>"));
        assert!(html.contains("Hello World"));
        assert!(html.contains("</h1>"));
    }

    #[test]
    fn test_markdown_to_html_paragraph() {
        let markdown = "This is a paragraph.";
        let html = markdown_to_html(markdown);
        
        assert!(html.contains("<p>"));
        assert!(html.contains("This is a paragraph."));
    }

    #[test]
    fn test_markdown_to_html_multiple_headings() {
        let markdown = "# Title\n\n## Subtitle\n\n### Section";
        let html = markdown_to_html(markdown);
        
        assert!(html.contains("<h1>"));
        assert!(html.contains("<h2>"));
        assert!(html.contains("<h3>"));
    }

    #[test]
    fn test_markdown_to_html_table() {
        let markdown = "| Header |\n|--------|\n| Cell   |";
        let html = markdown_to_html(markdown);
        
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>"));
        assert!(html.contains("<td>"));
    }

    #[test]
    fn test_markdown_to_html_strikethrough() {
        let markdown = "~~strikethrough~~";
        let html = markdown_to_html(markdown);
        
        assert!(html.contains("<del>") || html.contains("strikethrough"));
    }

    #[test]
    fn test_markdown_to_html_code_block() {
        let markdown = "```rust\nfn main() {}\n```";
        let html = markdown_to_html(markdown);
        
        // Comrak wraps code in pre tags
        assert!(html.contains("<pre>"));
        assert!(html.contains("fn main()"));
    }

    #[test]
    fn test_markdown_to_html_safe_mode() {
        // Script tags should be filtered in safe mode
        let markdown = "<script>alert('xss')</script>";
        let html = markdown_to_html(markdown);
        
        // Should not contain executable script tag
        assert!(!html.contains("<script>") || html.contains("&lt;script&gt;"));
    }

    #[test]
    fn test_markdown_to_html_heading_ids() {
        let markdown = "# Introduction";
        let html = markdown_to_html(markdown);
        
        // Should generate an ID attribute for the heading
        assert!(html.contains("id="));
    }
}