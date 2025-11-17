use std::fs;
use std::io;
use std::path::Path;

/// Errors that can occur during Markdown file loading.
#[derive(Debug, thiserror::Error)]
pub enum MdLoadError {
    /// File not found
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    /// IO error during file reading
    #[error("IO error: {0}")]
    IoError(#[from] io::Error),
    
    /// Invalid UTF-8 encoding
    #[error("Invalid UTF-8 encoding in file: {0}")]
    InvalidUtf8(String),
}

/// Loads a Markdown file from the filesystem.
/// 
/// # Arguments
/// 
/// * `path` - The file path to load
/// 
/// # Returns
/// 
/// * `Result<String, MdLoadError>` - The file contents as a UTF-8 string or an error
/// 
/// # Examples
/// 
/// ```no_run
/// use mdview::md::loader::load_markdown_file;
/// 
/// let content = load_markdown_file("README.md")?;
/// # Ok::<(), Box<dyn std::error::Error>>(())
/// ```
pub fn load_markdown_file<P: AsRef<Path>>(path: P) -> Result<String, MdLoadError> {
    let path_ref = path.as_ref();
    
    // Check if file exists
    if !path_ref.exists() {
        return Err(MdLoadError::FileNotFound(
            path_ref.display().to_string()
        ));
    }
    
    // Read file contents
    let bytes = fs::read(path_ref)?;
    
    // Validate UTF-8 encoding
    String::from_utf8(bytes).map_err(|_| {
        MdLoadError::InvalidUtf8(path_ref.display().to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_valid_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "# Test Markdown").unwrap();
        writeln!(temp_file, "This is a test.").unwrap();
        
        let result = load_markdown_file(temp_file.path());
        assert!(result.is_ok());
        
        let content = result.unwrap();
        assert!(content.contains("# Test Markdown"));
        assert!(content.contains("This is a test."));
    }

    #[test]
    fn test_load_nonexistent_file() {
        let result = load_markdown_file("/nonexistent/file.md");
        assert!(result.is_err());
        
        match result {
            Err(MdLoadError::FileNotFound(_)) => {},
            _ => panic!("Expected FileNotFound error"),
        }
    }

    #[test]
    fn test_load_invalid_utf8() {
        let mut temp_file = NamedTempFile::new().unwrap();
        // Write invalid UTF-8 bytes
        temp_file.write_all(&[0xFF, 0xFE, 0xFD]).unwrap();
        
        let result = load_markdown_file(temp_file.path());
        assert!(result.is_err());
        
        match result {
            Err(MdLoadError::InvalidUtf8(_)) => {},
            _ => panic!("Expected InvalidUtf8 error"),
        }
    }

    #[test]
    fn test_load_empty_file() {
        let temp_file = NamedTempFile::new().unwrap();
        
        let result = load_markdown_file(temp_file.path());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "");
    }
}