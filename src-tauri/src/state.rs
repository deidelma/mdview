use crate::history::FileHistory;
use crate::md::MarkdownDocument;
use std::sync::{Arc, Mutex};

/// Application state shared across Tauri commands.
///
/// This struct holds the current document and application settings.
/// All fields are wrapped in Mutex for thread-safe access.
pub struct AppState {
    /// The currently loaded Markdown document
    pub current_document: Mutex<Option<MarkdownDocument>>,
    /// The current zoom factor (1.0 = 100%)
    pub zoom_factor: Mutex<f64>,
    /// File history for navigation
    pub file_history: Arc<Mutex<FileHistory>>,
}

impl AppState {
    /// Creates a new AppState with default values.
    ///
    /// # Arguments
    ///
    /// * `file_history` - Shared file history instance
    pub fn new(file_history: Arc<Mutex<FileHistory>>) -> Self {
        Self {
            current_document: Mutex::new(None),
            zoom_factor: Mutex::new(1.0),
            file_history,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new(Arc::new(Mutex::new(FileHistory::new())))
    }
}
