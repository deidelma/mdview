use std::sync::Mutex;
use crate::md::MarkdownDocument;

/// Application state shared across Tauri commands.
/// 
/// This struct holds the current document and application settings.
/// All fields are wrapped in Mutex for thread-safe access.
pub struct AppState {
    /// The currently loaded Markdown document
    pub current_document: Mutex<Option<MarkdownDocument>>,
    /// The current zoom factor (1.0 = 100%)
    pub zoom_factor: Mutex<f64>,
}

impl AppState {
    /// Creates a new AppState with default values.
    pub fn new() -> Self {
        Self {
            current_document: Mutex::new(None),
            zoom_factor: Mutex::new(1.0),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}