pub mod loader;
pub mod parser;
pub mod toc;

use serde::{Deserialize, Serialize};

/// Represents a parsed Markdown document with its HTML content and table of contents.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarkdownDocument {
    /// The original file path
    pub path: String,
    /// The raw Markdown content
    pub raw_content: String,
    /// The parsed HTML content
    pub html_content: String,
    /// The extracted table of contents
    pub toc: Vec<TocItem>,
}

impl MarkdownDocument {
    /// Creates a new MarkdownDocument instance.
    pub fn new(path: String, raw_content: String, html_content: String, toc: Vec<TocItem>) -> Self {
        Self {
            path,
            raw_content,
            html_content,
            toc,
        }
    }

    /// Creates an empty MarkdownDocument.
    pub fn empty() -> Self {
        Self {
            path: String::new(),
            raw_content: String::new(),
            html_content: String::new(),
            toc: Vec::new(),
        }
    }
}

/// Represents a single item in the table of contents.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TocItem {
    /// The heading level (1-6 for h1-h6)
    pub level: u8,
    /// The heading text content
    pub text: String,
    /// The anchor ID for linking (e.g., "introduction")
    pub id: String,
    /// The line number in the original Markdown (optional)
    pub line_number: Option<usize>,
}

impl TocItem {
    /// Creates a new TocItem.
    pub fn new(level: u8, text: String, id: String) -> Self {
        Self {
            level,
            text,
            id,
            line_number: None,
        }
    }

    /// Creates a new TocItem with a line number.
    pub fn with_line_number(level: u8, text: String, id: String, line_number: usize) -> Self {
        Self {
            level,
            text,
            id,
            line_number: Some(line_number),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_document_new() {
        let doc = MarkdownDocument::new(
            "test.md".to_string(),
            "# Hello".to_string(),
            "<h1>Hello</h1>".to_string(),
            vec![],
        );
        
        assert_eq!(doc.path, "test.md");
        assert_eq!(doc.raw_content, "# Hello");
        assert_eq!(doc.html_content, "<h1>Hello</h1>");
        assert!(doc.toc.is_empty());
    }

    #[test]
    fn test_markdown_document_empty() {
        let doc = MarkdownDocument::empty();
        
        assert!(doc.path.is_empty());
        assert!(doc.raw_content.is_empty());
        assert!(doc.html_content.is_empty());
        assert!(doc.toc.is_empty());
    }

    #[test]
    fn test_toc_item_new() {
        let item = TocItem::new(1, "Introduction".to_string(), "introduction".to_string());
        
        assert_eq!(item.level, 1);
        assert_eq!(item.text, "Introduction");
        assert_eq!(item.id, "introduction");
        assert_eq!(item.line_number, None);
    }

    #[test]
    fn test_toc_item_with_line_number() {
        let item = TocItem::with_line_number(
            2,
            "Getting Started".to_string(),
            "getting-started".to_string(),
            10,
        );
        
        assert_eq!(item.level, 2);
        assert_eq!(item.text, "Getting Started");
        assert_eq!(item.id, "getting-started");
        assert_eq!(item.line_number, Some(10));
    }

    #[test]
    fn test_toc_item_equality() {
        let item1 = TocItem::new(1, "Test".to_string(), "test".to_string());
        let item2 = TocItem::new(1, "Test".to_string(), "test".to_string());
        
        assert_eq!(item1, item2);
    }

    #[test]
    fn test_serialization() {
        let doc = MarkdownDocument::new(
            "test.md".to_string(),
            "# Title".to_string(),
            "<h1>Title</h1>".to_string(),
            vec![TocItem::new(1, "Title".to_string(), "title".to_string())],
        );
        
        // Test that serialization works (will be used for Tauri commands)
        let json = serde_json::to_string(&doc);
        assert!(json.is_ok());
        
        // Test deserialization
        let deserialized: Result<MarkdownDocument, _> = serde_json::from_str(&json.unwrap());
        assert!(deserialized.is_ok());
    }
}