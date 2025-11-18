use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Maximum number of files to keep in history
const MAX_HISTORY_SIZE: usize = 20;

/// File history manager that tracks recently opened files.
///
/// The history is persisted to disk as JSON and maintains a maximum
/// of 20 files. Invalid/deleted files are removed during validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHistory {
    /// List of file paths in history
    files: Vec<String>,
    /// Current position in history (-1 if no position/empty history)
    current_index: isize,
}

impl FileHistory {
    /// Creates a new empty file history.
    pub fn new() -> Self {
        Self {
            files: Vec::new(),
            current_index: -1,
        }
    }

    /// Adds a file to the history.
    ///
    /// If the file already exists in history, it's moved to the end.
    /// Enforces the maximum history size limit.
    ///
    /// # Arguments
    ///
    /// * `path` - The file path to add
    pub fn add(&mut self, path: String) {
        // Remove if already exists
        if let Some(pos) = self.files.iter().position(|p| p == &path) {
            self.files.remove(pos);
            // Adjust current_index if needed
            if self.current_index as usize > pos {
                self.current_index -= 1;
            }
        }

        // Add to end
        self.files.push(path);

        // Enforce size limit
        if self.files.len() > MAX_HISTORY_SIZE {
            self.files.remove(0);
            // Adjust current_index since we removed from front
            if self.current_index > 0 {
                self.current_index -= 1;
            }
        }

        // Set current index to the newly added file
        self.current_index = (self.files.len() - 1) as isize;
    }

    /// Validates the history by removing files that no longer exist.
    /// Adjusts the current_index to maintain relative position.
    pub fn validate(&mut self) {
        let original_len = self.files.len();
        let current_idx = self.current_index;

        // Count how many files before current position are removed
        let mut removed_before = 0;
        if current_idx >= 0 {
            let current_pos = current_idx as usize;
            for i in 0..current_pos.min(original_len) {
                if !PathBuf::from(&self.files[i]).exists() {
                    removed_before += 1;
                }
            }
        }

        // Remove invalid files
        self.files.retain(|path| PathBuf::from(path).exists());

        // Adjust current_index
        if self.files.is_empty() {
            self.current_index = -1;
        } else if current_idx >= 0 {
            let new_index = (current_idx as isize - removed_before as isize).max(0);
            // Ensure index is within bounds
            self.current_index = new_index.min((self.files.len() - 1) as isize);
        }
    }

    /// Gets the previous file path in history.
    /// Validates and removes invalid files before returning.
    ///
    /// # Returns
    ///
    /// * `Option<String>` - The previous file path, or None if at the beginning or history is empty
    pub fn previous(&mut self) -> Option<String> {
        self.validate();

        if self.files.is_empty() || self.current_index <= 0 {
            return None;
        }

        self.current_index -= 1;
        Some(self.files[self.current_index as usize].clone())
    }

    /// Gets the next file path in history.
    /// Validates and removes invalid files before returning.
    ///
    /// # Returns
    ///
    /// * `Option<String>` - The next file path, or None if at the end or history is empty
    pub fn next(&mut self) -> Option<String> {
        self.validate();

        if self.files.is_empty() {
            return None;
        }

        let max_index = (self.files.len() - 1) as isize;
        if self.current_index >= max_index {
            return None;
        }

        self.current_index += 1;
        Some(self.files[self.current_index as usize].clone())
    }

    /// Checks if we can navigate to a previous file.
    ///
    /// # Returns
    ///
    /// * `bool` - True if there are files before the current position
    pub fn can_go_back(&self) -> bool {
        !self.files.is_empty() && self.current_index > 0
    }

    /// Checks if we can navigate to a next file.
    ///
    /// # Returns
    ///
    /// * `bool` - True if there are files after the current position
    pub fn can_go_forward(&self) -> bool {
        !self.files.is_empty() && self.current_index < (self.files.len() - 1) as isize
    }

    /// Loads history from the config directory.
    /// Returns an empty history if the file doesn't exist or is corrupted.
    ///
    /// # Arguments
    ///
    /// * `config_dir` - The application config directory path
    ///
    /// # Returns
    ///
    /// * `FileHistory` - The loaded history or a new empty one
    pub fn load(config_dir: &PathBuf) -> Self {
        let history_path = config_dir.join("history.json");

        if !history_path.exists() {
            return Self::new();
        }

        match fs::read_to_string(&history_path) {
            Ok(contents) => {
                match serde_json::from_str::<FileHistory>(&contents) {
                    Ok(mut history) => {
                        // Validate immediately after loading
                        history.validate();
                        history
                    }
                    Err(e) => {
                        eprintln!("Failed to parse history.json (corrupted): {}", e);
                        Self::new()
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to read history.json: {}", e);
                Self::new()
            }
        }
    }

    /// Saves history to the config directory.
    /// Creates the config directory if it doesn't exist.
    ///
    /// # Arguments
    ///
    /// * `config_dir` - The application config directory path
    ///
    /// # Returns
    ///
    /// * `Result<(), String>` - Ok on success, or error message
    pub fn save(&self, config_dir: &PathBuf) -> Result<(), String> {
        // Create config directory if it doesn't exist
        if !config_dir.exists() {
            fs::create_dir_all(config_dir)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        let history_path = config_dir.join("history.json");
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize history: {}", e))?;

        fs::write(&history_path, json)
            .map_err(|e| format!("Failed to write history file: {}", e))?;

        Ok(())
    }
}

impl Default for FileHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn test_add_file() {
        let mut history = FileHistory::new();
        history.add("/path/to/file1.md".to_string());

        assert_eq!(history.files.len(), 1);
        assert_eq!(history.current_index, 0);
    }

    #[test]
    fn test_deduplication() {
        let mut history = FileHistory::new();
        history.add("/path/to/file1.md".to_string());
        history.add("/path/to/file2.md".to_string());
        history.add("/path/to/file1.md".to_string()); // Duplicate

        assert_eq!(history.files.len(), 2);
        assert_eq!(history.files[1], "/path/to/file1.md");
        assert_eq!(history.current_index, 1);
    }

    #[test]
    fn test_max_size_limit() {
        let mut history = FileHistory::new();

        for i in 0..25 {
            history.add(format!("/path/to/file{}.md", i));
        }

        assert_eq!(history.files.len(), MAX_HISTORY_SIZE);
        assert_eq!(history.files[0], "/path/to/file5.md"); // First 5 removed
    }

    #[test]
    fn test_can_go_back_forward() {
        let mut history = FileHistory::new();
        history.add("/path/to/file1.md".to_string());
        history.add("/path/to/file2.md".to_string());
        history.add("/path/to/file3.md".to_string());

        // At end
        assert!(history.can_go_back());
        assert!(!history.can_go_forward());

        // Move back
        history.previous();
        assert!(history.can_go_back());
        assert!(history.can_go_forward());

        // Move to beginning
        history.previous();
        assert!(!history.can_go_back());
        assert!(history.can_go_forward());
    }

    #[test]
    fn test_validate_removes_missing_files() {
        let temp_dir = tempdir().unwrap();
        let file1 = temp_dir.path().join("file1.md");
        let file2 = temp_dir.path().join("file2.md");

        // Create files
        File::create(&file1).unwrap();
        File::create(&file2).unwrap();

        let mut history = FileHistory::new();
        history.add(file1.to_str().unwrap().to_string());
        history.add(file2.to_str().unwrap().to_string());

        // Delete file1
        fs::remove_file(&file1).unwrap();

        history.validate();

        assert_eq!(history.files.len(), 1);
        assert_eq!(history.files[0], file2.to_str().unwrap());
        assert_eq!(history.current_index, 0);
    }

    #[test]
    fn test_save_and_load() {
        let temp_dir = tempdir().unwrap();
        let config_dir = temp_dir.path().to_path_buf();

        let mut history = FileHistory::new();
        history.add("/path/to/file1.md".to_string());
        history.add("/path/to/file2.md".to_string());

        // Save
        history.save(&config_dir).unwrap();

        // Load
        let loaded = FileHistory::load(&config_dir);

        assert_eq!(loaded.files.len(), 2);
        assert_eq!(loaded.current_index, 1);
    }
}
