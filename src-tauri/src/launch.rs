use std::path::Path;

const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd", "mdx"];

fn select_markdown_file<'a>(paths: impl IntoIterator<Item = &'a String>) -> Option<String> {
    paths
        .into_iter()
        .find(|path| is_markdown_file(Path::new(path.as_str())))
        .cloned()
}

/// Selects the first file path supplied on the initial CLI invocation.
pub fn select_initial_file(files: &[String]) -> Option<String> {
    select_markdown_file(files.iter())
}

/// Selects the first forwarded file path from a second app launch.
///
/// Tauri's single-instance callback includes the executable path as argv[0].
pub fn select_relaunch_file(argv: &[String]) -> Option<String> {
    select_markdown_file(argv.iter().skip(1))
}

/// Returns true if the file path has a supported Markdown extension.
pub fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            MARKDOWN_EXTENSIONS
                .iter()
                .any(|candidate| candidate.eq_ignore_ascii_case(ext))
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_select_initial_file_uses_first_file() {
        let files = vec!["first.md".to_string(), "second.md".to_string()];

        assert_eq!(select_initial_file(&files), Some("first.md".to_string()));
    }

    #[test]
    fn test_select_initial_file_handles_empty_input() {
        assert_eq!(select_initial_file(&[]), None);
    }

    #[test]
    fn test_select_initial_file_skips_non_markdown_tokens() {
        let files = vec!["-psn_0_12345".to_string(), "notes.md".to_string()];

        assert_eq!(select_initial_file(&files), Some("notes.md".to_string()));
    }

    #[test]
    fn test_select_initial_file_ignores_non_markdown_paths() {
        let files = vec!["README.txt".to_string(), "notes.md".to_string()];

        assert_eq!(select_initial_file(&files), Some("notes.md".to_string()));
    }

    #[test]
    fn test_select_relaunch_file_skips_executable_path() {
        let argv = vec![
            "C:\\mdview.exe".to_string(),
            "C:\\docs\\guide.md".to_string(),
        ];

        assert_eq!(
            select_relaunch_file(&argv),
            Some("C:\\docs\\guide.md".to_string())
        );
    }

    #[test]
    fn test_select_relaunch_file_uses_first_forwarded_file() {
        let argv = vec![
            "C:\\mdview.exe".to_string(),
            "C:\\docs\\first.md".to_string(),
            "C:\\docs\\second.md".to_string(),
        ];

        assert_eq!(
            select_relaunch_file(&argv),
            Some("C:\\docs\\first.md".to_string())
        );
    }

    #[test]
    fn test_select_relaunch_file_skips_non_markdown_tokens() {
        let argv = vec![
            "/Applications/mdview.app/Contents/MacOS/mdview".to_string(),
            "-psn_0_12345".to_string(),
            "/Users/example/Documents/guide.md".to_string(),
        ];

        assert_eq!(
            select_relaunch_file(&argv),
            Some("/Users/example/Documents/guide.md".to_string())
        );
    }

    #[test]
    fn test_is_markdown_file_supports_expected_extensions() {
        assert!(is_markdown_file(Path::new("guide.md")));
        assert!(is_markdown_file(Path::new("guide.MDX")));
        assert!(!is_markdown_file(Path::new("guide.txt")));
    }
}
