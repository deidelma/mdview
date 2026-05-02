use mdview::md::{loader, MarkdownDocument};
use tempfile::tempdir;

#[test]
fn save_then_load_document_round_trips_content_and_toc() {
    let temp_dir = tempdir().unwrap();
    let path = temp_dir.path().join("draft.md");
    let source = "# Title\n\n## Section\n\nParagraph.";

    loader::save_markdown_file(&path, source).unwrap();
    let document = MarkdownDocument::from_file(&path).unwrap();

    assert_eq!(document.raw_content, source);
    assert_eq!(document.toc.len(), 2);
    assert_eq!(document.toc[0].id, "title");
    assert_eq!(document.toc[1].id, "section");
    assert!(document.html_content.contains("<h1"));
    assert!(document.html_content.contains("<h2"));
}

#[test]
fn in_memory_and_disk_backed_documents_render_same_preview() {
    let temp_dir = tempdir().unwrap();
    let path = temp_dir.path().join("preview.md");
    let source = "# Same\n\n- one\n- two\n";

    let in_memory = MarkdownDocument::from_source(path.display().to_string(), source.to_string());
    loader::save_markdown_file(&path, source).unwrap();
    let from_disk = MarkdownDocument::from_file(&path).unwrap();

    assert_eq!(in_memory.raw_content, from_disk.raw_content);
    assert_eq!(in_memory.html_content, from_disk.html_content);
    assert_eq!(in_memory.toc, from_disk.toc);
}
