use super::TocItem;
use comrak::nodes::{AstNode, NodeValue};
use comrak::{parse_document, Arena, Options};

/// Extracts table of contents from Markdown text.
/// 
/// # Arguments
/// 
/// * `markdown` - The Markdown source text
/// 
/// # Returns
/// 
/// * `Vec<TocItem>` - The extracted TOC items
/// 
/// # Examples
/// 
/// ```
/// use mdview::md::toc::extract_toc;
/// 
/// let markdown = "# Title\n## Subtitle";
/// let toc = extract_toc(markdown);
/// assert_eq!(toc.len(), 2);
/// ```
pub fn extract_toc(markdown: &str) -> Vec<TocItem> {
    let arena = Arena::new();
    let mut options = Options::default();
    options.extension.header_ids = Some(String::new());
    
    let root = parse_document(&arena, markdown, &options);
    let mut toc_items = Vec::new();
    
    extract_headings(root, &mut toc_items);
    
    toc_items
}

/// Recursively traverses the AST to find heading nodes.
fn extract_headings<'a>(node: &'a AstNode<'a>, toc_items: &mut Vec<TocItem>) {
    match &node.data.borrow().value {
        NodeValue::Heading(heading) => {
            let level = heading.level as u8;
            let text = extract_text(node);
            let id = generate_id(&text);
            
            // Get line number if available
            let line_number = node.data.borrow().sourcepos.start.line;
            
            if line_number > 0 {
                toc_items.push(TocItem::with_line_number(
                    level,
                    text,
                    id,
                    line_number as usize,
                ));
            } else {
                toc_items.push(TocItem::new(level, text, id));
            }
        }
        _ => {
            // Recursively traverse children
            for child in node.children() {
                extract_headings(child, toc_items);
            }
        }
    }
}

/// Extracts plain text from a heading node.
fn extract_text<'a>(node: &'a AstNode<'a>) -> String {
    let mut text = String::new();
    
    for child in node.children() {
        collect_text(child, &mut text);
    }
    
    text.trim().to_string()
}

/// Recursively collects text from nodes.
fn collect_text<'a>(node: &'a AstNode<'a>, text: &mut String) {
    match &node.data.borrow().value {
        NodeValue::Text(t) => {
            text.push_str(t);
        }
        NodeValue::Code(code) => {
            text.push_str(&code.literal);
        }
        _ => {
            for child in node.children() {
                collect_text(child, text);
            }
        }
    }
}

/// Generates a URL-safe ID from heading text.
fn generate_id(text: &str) -> String {
    let id = text
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c
            } else if c.is_whitespace() {
                '-'
            } else {
                '_'
            }
        })
        .collect::<String>();
    
    // Collapse multiple consecutive dashes
    let mut result = String::new();
    let mut prev_dash = false;
    for c in id.chars() {
        if c == '-' {
            if !prev_dash {
                result.push(c);
            }
            prev_dash = true;
        } else {
            result.push(c);
            prev_dash = false;
        }
    }
    
    result
        .trim_matches('-')
        .trim_matches('_')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_toc_single_heading() {
        let markdown = "# Title";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 1);
        assert_eq!(toc[0].level, 1);
        assert_eq!(toc[0].text, "Title");
        assert_eq!(toc[0].id, "title");
    }

    #[test]
    fn test_extract_toc_multiple_headings() {
        let markdown = "# Title\n## Subtitle\n### Section";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 3);
        assert_eq!(toc[0].level, 1);
        assert_eq!(toc[1].level, 2);
        assert_eq!(toc[2].level, 3);
    }

    #[test]
    fn test_extract_toc_with_formatting() {
        let markdown = "# **Bold** and *italic*";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 1);
        assert_eq!(toc[0].text, "Bold and italic");
    }

    #[test]
    fn test_extract_toc_empty() {
        let markdown = "Just a paragraph.";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 0);
    }

    #[test]
    fn test_extract_toc_mixed_content() {
        let markdown = "Some text\n\n# Heading 1\n\nMore text\n\n## Heading 2";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 2);
        assert_eq!(toc[0].text, "Heading 1");
        assert_eq!(toc[1].text, "Heading 2");
    }

    #[test]
    fn test_generate_id() {
        assert_eq!(generate_id("Hello World"), "hello-world");
        assert_eq!(generate_id("Test & Demo"), "test-_-demo");
        assert_eq!(generate_id("  Spaces  "), "spaces");
        assert_eq!(generate_id("Multiple   Spaces"), "multiple-spaces");
    }

    #[test]
    fn test_extract_toc_with_code() {
        let markdown = "# Using `code` in headings";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 1);
        assert_eq!(toc[0].text, "Using code in headings");
    }

    #[test]
    fn test_extract_toc_line_numbers() {
        let markdown = "# First\n\nParagraph\n\n## Second";
        let toc = extract_toc(markdown);
        
        assert_eq!(toc.len(), 2);
        assert!(toc[0].line_number.is_some());
        assert!(toc[1].line_number.is_some());
    }
}