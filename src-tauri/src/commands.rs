use crate::md::{loader::MdLoadError, parser, MarkdownDocument};
use crate::state::AppState;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};

const ABOUT_COPYRIGHT: &str = "Copyright (c) 2025, 2026 David Eidelman";
const MIT_LICENSE_TEXT: &str = include_str!("../../LICENSE");
const THIRD_PARTY_NOTICES_TEXT: &str = include_str!("../../THIRD_PARTY_LICENSES.md");

/// Error type for command operations.
#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<crate::md::loader::MdLoadError> for CommandError {
    fn from(err: crate::md::loader::MdLoadError) -> Self {
        Self {
            message: err.to_string(),
        }
    }
}

#[derive(Debug, serde::Serialize, PartialEq, Eq)]
pub struct AboutInfo {
    pub app_name: String,
    pub version: String,
    pub description: String,
    pub copyright: String,
    pub mit_license_html: String,
    pub third_party_notices_html: String,
}

fn build_about_info() -> AboutInfo {
    AboutInfo {
        app_name: env!("CARGO_PKG_NAME").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: env!("CARGO_PKG_DESCRIPTION").to_string(),
        copyright: ABOUT_COPYRIGHT.to_string(),
        mit_license_html: parser::markdown_to_html(MIT_LICENSE_TEXT),
        third_party_notices_html: parser::markdown_to_html(THIRD_PARTY_NOTICES_TEXT),
    }
}

fn persist_file_history(app: &AppHandle, window_label: &str, state: &AppState) {
    let history = state.file_history.lock().unwrap();

    if let Ok(config_dir) = app.path().app_config_dir() {
        if let Err(e) = history.save(&config_dir) {
            eprintln!("Failed to save file history: {}", e);
            if let Some(window) = app.get_webview_window(window_label) {
                use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                let _ = window
                    .dialog()
                    .message(&format!("Failed to save file history: {}", e))
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
            }
        }
    }
}

fn document_from_source(path: String, raw_content: String) -> MarkdownDocument {
    MarkdownDocument::from_source(path, raw_content)
}

fn unsaved_document_from_source(path: String, raw_content: String) -> MarkdownDocument {
    MarkdownDocument::from_unsaved_source(path, raw_content)
}

pub(crate) fn create_unsaved_document_into_state(
    state: &AppState,
    window_label: &str,
    path: &str,
) -> MarkdownDocument {
    let document = unsaved_document_from_source(path.to_string(), String::new());
    state.set_current_document(window_label, document.clone());
    document
}

pub(crate) fn save_document_into_state(
    app: &AppHandle,
    state: &AppState,
    window_label: &str,
    path: &str,
    raw_content: &str,
) -> Result<MarkdownDocument, MdLoadError> {
    crate::md::loader::save_markdown_file(path, raw_content)?;

    let document = document_from_source(path.to_string(), raw_content.to_string());
    state.set_current_document(window_label, document.clone());

    {
        let mut history = state.file_history.lock().unwrap();
        history.add(path.to_string());
    }
    persist_file_history(app, window_label, state);

    Ok(document)
}

pub(crate) fn load_document_into_state(
    app: &AppHandle,
    state: &AppState,
    window_label: &str,
    path: &str,
) -> Result<MarkdownDocument, MdLoadError> {
    let document = MarkdownDocument::from_file(path)?;
    state.set_current_document(window_label, document.clone());

    {
        let mut history = state.file_history.lock().unwrap();
        history.add(path.to_string());
    }
    persist_file_history(app, window_label, state);

    Ok(document)
}

pub(crate) fn emit_document_loaded(window: &WebviewWindow, document: &MarkdownDocument) {
    if let Err(e) = window.emit("document-loaded", document) {
        eprintln!("Failed to emit document-loaded event: {}", e);
    }
}

pub(crate) fn emit_document_load_error(window: &WebviewWindow, path: &str, error: &MdLoadError) {
    eprintln!("Failed to load file '{}': {}", path, error);
    if let Err(emit_err) = window.emit("document-load-error", error.to_string()) {
        eprintln!("Failed to emit error event: {}", emit_err);
    }
}

pub(crate) fn emit_document_error_message(window: &WebviewWindow, message: &str) {
    if let Err(emit_err) = window.emit("document-load-error", message.to_string()) {
        eprintln!("Failed to emit error event: {}", emit_err);
    }
}

#[tauri::command]
pub async fn get_about_info() -> AboutInfo {
    build_about_info()
}

#[tauri::command]
pub async fn parse_markdown(
    path: String,
    source: String,
) -> Result<MarkdownDocument, CommandError> {
    Ok(document_from_source(path, source))
}

/// Opens and loads a Markdown document.
///
/// # Arguments
///
/// * `path` - The file path to open
/// * `state` - Application state
/// * `app` - Application handle for error dialogs
///
/// # Returns
///
/// * `Result<MarkdownDocument, CommandError>` - The loaded document or an error
#[tauri::command]
pub async fn open_document(
    path: String,
    window: WebviewWindow,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<MarkdownDocument, CommandError> {
    Ok(load_document_into_state(
        &app,
        state.inner(),
        window.label(),
        &path,
    )?)
}

/// Reloads the current document from disk.
///
/// # Arguments
///
/// * `state` - Application state
///
/// # Returns
///
/// * `Result<MarkdownDocument, CommandError>` - The reloaded document or an error
#[tauri::command]
pub async fn reload_document(
    window: WebviewWindow,
    state: State<'_, AppState>,
) -> Result<MarkdownDocument, CommandError> {
    let current_document = state
        .get_current_document(window.label())
        .ok_or_else(|| CommandError {
            message: "No document is currently loaded".to_string(),
        })?;

    if !current_document.is_saved_to_disk {
        return Err(CommandError {
            message: "The current document has not been saved to disk yet".to_string(),
        });
    }

    let path = current_document.path;

    // Reload the document
    let document = MarkdownDocument::from_file(&path)?;

    // Update state
    state.set_current_document(window.label(), document.clone());

    Ok(document)
}

/// Saves the current Markdown source to disk and updates window state.
#[tauri::command]
pub async fn save_document(
    path: String,
    source: String,
    window: WebviewWindow,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<MarkdownDocument, CommandError> {
    Ok(save_document_into_state(
        &app,
        state.inner(),
        window.label(),
        &path,
        &source,
    )?)
}

/// Sets the zoom factor for the document view.
///
/// # Arguments
///
/// * `factor` - The zoom factor (1.0 = 100%, 1.5 = 150%, etc.)
/// * `state` - Application state
///
/// # Returns
///
/// * `Result<f64, CommandError>` - The new zoom factor
#[tauri::command]
pub async fn set_zoom_factor(factor: f64, state: State<'_, AppState>) -> Result<f64, CommandError> {
    // Validate zoom factor (between 0.5 and 3.0)
    if !(0.5..=3.0).contains(&factor) {
        return Err(CommandError {
            message: format!("Zoom factor must be between 0.5 and 3.0, got {}", factor),
        });
    }

    let mut zoom = state.zoom_factor.lock().unwrap();
    *zoom = factor;

    Ok(factor)
}

/// Gets the current zoom factor.
///
/// # Arguments
///
/// * `state` - Application state
///
/// # Returns
///
/// * `Result<f64, CommandError>` - The current zoom factor
#[tauri::command]
pub async fn get_zoom_factor(state: State<'_, AppState>) -> Result<f64, CommandError> {
    let zoom = state.zoom_factor.lock().unwrap();
    Ok(*zoom)
}

/// Gets the currently loaded document if any.
///
/// # Arguments
///
/// * `state` - Application state
///
/// # Returns
///
/// * `Result<Option<MarkdownDocument>, CommandError>` - The current document or None
#[tauri::command]
pub async fn get_current_document(
    window: WebviewWindow,
    state: State<'_, AppState>,
) -> Result<Option<MarkdownDocument>, CommandError> {
    Ok(state.get_current_document(window.label()))
}

/// Navigation state for UI button management.
#[derive(Debug, serde::Serialize)]
pub struct NavigationState {
    pub can_go_back: bool,
    pub can_go_forward: bool,
}

/// Gets the navigation state (whether back/forward navigation is possible).
///
/// # Arguments
///
/// * `state` - Application state
///
/// # Returns
///
/// * `Result<NavigationState, CommandError>` - The navigation state
#[tauri::command]
pub async fn get_navigation_state(
    window: WebviewWindow,
    state: State<'_, AppState>,
) -> Result<NavigationState, CommandError> {
    let history = state.file_history.lock().unwrap();
    let current_document = state.get_current_document(window.label());
    drop(history);

    let mut history = state.file_history.lock().unwrap();
    if let Some(document) = current_document {
        history.set_current_to_path(&document.path);
    }

    Ok(NavigationState {
        can_go_back: history.can_go_back(),
        can_go_forward: history.can_go_forward(),
    })
}

/// Navigates to the previous file in history.
///
/// # Arguments
///
/// * `state` - Application state
/// * `app` - Application handle for error dialogs
///
/// # Returns
///
/// * `Result<MarkdownDocument, CommandError>` - The loaded document or an error
#[tauri::command]
pub async fn navigate_previous(
    window: WebviewWindow,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<MarkdownDocument, CommandError> {
    // Get previous file path from history
    let (path, previous_index, attempted_index) = {
        let mut history = state.file_history.lock().unwrap();
        if let Some(current_document) = state.get_current_document(window.label()) {
            history.set_current_to_path(&current_document.path);
        }
        let previous_index = history.current_index();
        let path = history.previous();
        let attempted_index = history.current_index();
        (path, previous_index, attempted_index)
    };

    match path {
        Some(p) => {
            // Load the document
            let document = match MarkdownDocument::from_file(&p) {
                Ok(document) => document,
                Err(err) => {
                    let mut history = state.file_history.lock().unwrap();
                    history.rollback_current_index(attempted_index, previous_index);
                    return Err(err.into());
                }
            };

            // Update state
            state.set_current_document(window.label(), document.clone());

            // Save history (position changed)
            persist_file_history(&app, window.label(), state.inner());

            Ok(document)
        }
        None => Err(CommandError {
            message: "No previous file in history".to_string(),
        }),
    }
}

/// Navigates to the next file in history.
///
/// # Arguments
///
/// * `state` - Application state
/// * `app` - Application handle for error dialogs
///
/// # Returns
///
/// * `Result<MarkdownDocument, CommandError>` - The loaded document or an error
#[tauri::command]
pub async fn navigate_next(
    window: WebviewWindow,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<MarkdownDocument, CommandError> {
    // Get next file path from history
    let (path, previous_index, attempted_index) = {
        let mut history = state.file_history.lock().unwrap();
        if let Some(current_document) = state.get_current_document(window.label()) {
            history.set_current_to_path(&current_document.path);
        }
        let previous_index = history.current_index();
        let path = history.next();
        let attempted_index = history.current_index();
        (path, previous_index, attempted_index)
    };

    match path {
        Some(p) => {
            // Load the document
            let document = match MarkdownDocument::from_file(&p) {
                Ok(document) => document,
                Err(err) => {
                    let mut history = state.file_history.lock().unwrap();
                    history.rollback_current_index(attempted_index, previous_index);
                    return Err(err.into());
                }
            };

            // Update state
            state.set_current_document(window.label(), document.clone());

            // Save history (position changed)
            persist_file_history(&app, window.label(), state.inner());

            Ok(document)
        }
        None => Err(CommandError {
            message: "No next file in history".to_string(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_error_from_load_error() {
        use crate::md::loader::MdLoadError;

        let load_err = MdLoadError::FileNotFound("/test/path.md".to_string());
        let cmd_err: CommandError = load_err.into();

        assert!(cmd_err.message.contains("File not found"));
        assert!(cmd_err.message.contains("/test/path.md"));
    }

    #[test]
    fn test_zoom_factor_validation_bounds() {
        // Test that our validation logic is correct
        assert!((0.5..=3.0).contains(&0.5));
        assert!((0.5..=3.0).contains(&3.0));
        assert!(!(0.5..=3.0).contains(&0.49));
        assert!(!(0.5..=3.0).contains(&3.01));
    }

    #[test]
    fn test_build_about_info_contains_expected_content() {
        let about = build_about_info();

        assert_eq!(about.app_name, "mdview");
        assert_eq!(about.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(about.description, env!("CARGO_PKG_DESCRIPTION"));
        assert_eq!(about.copyright, ABOUT_COPYRIGHT);
        assert!(about.mit_license_html.contains("MIT License"));
        assert!(about.mit_license_html.contains("<p>"));
        assert!(about
            .third_party_notices_html
            .contains("Third-Party Licenses"));
        assert!(about.third_party_notices_html.contains("<h1"));
    }
}
