use crate::history::FileHistory;
use crate::md::MarkdownDocument;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Application state shared across Tauri commands.
///
/// This struct holds the current document and application settings.
/// All fields are wrapped in Mutex for thread-safe access.
pub struct AppState {
    /// The currently loaded Markdown document for each window label
    pub current_documents: Mutex<HashMap<String, MarkdownDocument>>,
    /// The current zoom factor (1.0 = 100%)
    pub zoom_factor: Mutex<f64>,
    /// File history for navigation
    pub file_history: Arc<Mutex<FileHistory>>,
    /// Monotonic counter for generating unique viewer window labels
    pub next_window_index: Mutex<usize>,
}

impl AppState {
    /// Creates a new AppState with default values.
    ///
    /// # Arguments
    ///
    /// * `file_history` - Shared file history instance
    pub fn new(file_history: Arc<Mutex<FileHistory>>) -> Self {
        Self {
            current_documents: Mutex::new(HashMap::new()),
            zoom_factor: Mutex::new(1.0),
            file_history,
            next_window_index: Mutex::new(1),
        }
    }

    /// Stores the current document for a specific window.
    pub fn set_current_document(&self, window_label: &str, document: MarkdownDocument) {
        let mut current_documents = self.current_documents.lock().unwrap();
        current_documents.insert(window_label.to_string(), document);
    }

    /// Gets the current document for a specific window.
    pub fn get_current_document(&self, window_label: &str) -> Option<MarkdownDocument> {
        let current_documents = self.current_documents.lock().unwrap();
        current_documents.get(window_label).cloned()
    }

    /// Removes the current document entry for a specific window.
    pub fn clear_current_document(&self, window_label: &str) {
        let mut current_documents = self.current_documents.lock().unwrap();
        current_documents.remove(window_label);
    }

    /// Generates a unique label for a new viewer window.
    pub fn next_window_label(&self) -> String {
        let mut next_window_index = self.next_window_index.lock().unwrap();
        let label = format!("viewer-{}", *next_window_index);
        *next_window_index += 1;
        label
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new(Arc::new(Mutex::new(FileHistory::new())))
    }
}
