use super::TocItem;

// Placeholder for extract_toc function
// Will be implemented in Step 5 with comrak dependency

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
/// # Note
/// 
/// This is a placeholder. Full implementation will be added in Step 5.
pub fn extract_toc(_markdown: &str) -> Vec<TocItem> {
    // TODO: Implement with comrak in Step 5
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_toc_placeholder() {
        let result = extract_toc("# Title\n## Subtitle");
        assert!(result.is_empty()); // Placeholder returns empty
    }
}