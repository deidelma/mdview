use crate::history::FileHistory;
use crate::md::MarkdownDocument;
use crate::settings::{
    AppPreferences, PersistedState, SessionSnapshot, ThemeMode, ThemePalette, WindowRole,
    WindowSession,
};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

/// Application state shared across Tauri commands.
///
/// This struct holds the current document and application settings.
/// All fields are wrapped in Mutex for thread-safe access.
pub struct AppState {
    /// The currently loaded Markdown document for each window label
    pub current_documents: Mutex<HashMap<String, MarkdownDocument>>,
    /// Persisted application preferences shared across windows
    pub preferences: Mutex<AppPreferences>,
    /// Persisted session snapshot for window restore
    pub session: Mutex<SessionSnapshot>,
    /// File history for navigation
    pub file_history: Arc<Mutex<FileHistory>>,
    /// Monotonic counter for generating unique viewer window labels
    pub next_window_index: Mutex<usize>,
    /// Config directory used for persisted state files
    pub config_dir: Option<PathBuf>,
}

impl AppState {
    /// Creates a new AppState with default values.
    ///
    /// # Arguments
    ///
    /// * `file_history` - Shared file history instance
    pub fn new(
        file_history: Arc<Mutex<FileHistory>>,
        persisted_state: PersistedState,
        config_dir: Option<PathBuf>,
    ) -> Self {
        let next_window_index = next_viewer_index_from_session(&persisted_state.session);

        Self {
            current_documents: Mutex::new(HashMap::new()),
            preferences: Mutex::new(persisted_state.preferences),
            session: Mutex::new(persisted_state.session),
            file_history,
            next_window_index: Mutex::new(next_window_index),
            config_dir,
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

    pub fn zoom_factor(&self) -> f64 {
        self.preferences.lock().unwrap().zoom_factor
    }

    pub fn theme_mode(&self) -> ThemeMode {
        self.preferences.lock().unwrap().theme_mode
    }

    pub fn theme_palette(&self) -> ThemePalette {
        self.preferences.lock().unwrap().theme_palette
    }

    pub fn working_directory(&self) -> Option<String> {
        self.preferences.lock().unwrap().working_directory.clone()
    }

    pub fn update_preferences(&self, updater: impl FnOnce(&mut AppPreferences)) {
        let mut preferences = self.preferences.lock().unwrap();
        updater(&mut preferences);
    }

    pub fn persisted_state(&self) -> PersistedState {
        PersistedState {
            preferences: self.preferences.lock().unwrap().clone(),
            session: self.session.lock().unwrap().clone(),
        }
    }

    pub fn update_window_session(&self, window_session: WindowSession) {
        let mut session = self.session.lock().unwrap();
        if let Some(existing) = session
            .windows
            .iter_mut()
            .find(|existing| existing.label == window_session.label)
        {
            *existing = window_session;
            return;
        }

        session.windows.push(window_session);
    }

    pub fn update_window_document_path(&self, window_label: &str, document_path: Option<String>) {
        let mut session = self.session.lock().unwrap();
        if let Some(existing) = session
            .windows
            .iter_mut()
            .find(|existing| existing.label == window_label)
        {
            existing.document_path = document_path;
            return;
        }

        session.windows.push(WindowSession {
            label: window_label.to_string(),
            role: if window_label == "main" {
                WindowRole::Main
            } else {
                WindowRole::Viewer
            },
            geometry: None,
            is_maximized: false,
            is_fullscreen: false,
            document_path,
        });
    }

    pub fn remove_window_session(&self, window_label: &str) {
        let mut session = self.session.lock().unwrap();
        session
            .windows
            .retain(|window| window.label != window_label);
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new(
            Arc::new(Mutex::new(FileHistory::new())),
            PersistedState::default(),
            None,
        )
    }
}

fn next_viewer_index_from_session(session: &SessionSnapshot) -> usize {
    session
        .windows
        .iter()
        .filter_map(|window| window.label.strip_prefix("viewer-"))
        .filter_map(|suffix| suffix.parse::<usize>().ok())
        .max()
        .map(|value| value + 1)
        .unwrap_or(1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{ThemeMode, WindowRole};

    #[test]
    fn next_window_label_resumes_after_restored_session() {
        let state = AppState::new(
            Arc::new(Mutex::new(FileHistory::new())),
            PersistedState {
                preferences: AppPreferences::default(),
                session: SessionSnapshot {
                    windows: vec![
                        WindowSession {
                            label: "main".to_string(),
                            role: WindowRole::Main,
                            geometry: None,
                            is_maximized: false,
                            is_fullscreen: false,
                            document_path: None,
                        },
                        WindowSession {
                            label: "viewer-3".to_string(),
                            role: WindowRole::Viewer,
                            geometry: None,
                            is_maximized: false,
                            is_fullscreen: false,
                            document_path: None,
                        },
                    ],
                },
            },
            None,
        );

        assert_eq!(state.next_window_label(), "viewer-4");
    }

    #[test]
    fn persisted_state_reflects_preference_updates() {
        let state = AppState::default();
        state.update_preferences(|preferences| {
            preferences.theme_mode = ThemeMode::Dark;
            preferences.zoom_factor = 1.4;
        });

        let persisted = state.persisted_state();
        assert_eq!(persisted.preferences.theme_mode, ThemeMode::Dark);
        assert_eq!(persisted.preferences.zoom_factor, 1.4);
    }
}
