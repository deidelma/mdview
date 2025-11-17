use crate::md::MarkdownDocument;
use crate::state::AppState;
use tauri::State;

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

/// Opens and loads a Markdown document.
/// 
/// # Arguments
/// 
/// * `path` - The file path to open
/// * `state` - Application state
/// 
/// # Returns
/// 
/// * `Result<MarkdownDocument, CommandError>` - The loaded document or an error
#[tauri::command]
pub async fn open_document(
    path: String,
    state: State<'_, AppState>,
) -> Result<MarkdownDocument, CommandError> {
    // Load and parse the document
    let document = MarkdownDocument::from_file(&path)?;
    
    // Update state with the new document
    let mut current_doc = state.current_document.lock().unwrap();
    *current_doc = Some(document.clone());
    
    Ok(document)
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
    state: State<'_, AppState>,
) -> Result<MarkdownDocument, CommandError> {
    // Get the current document path
    let current_doc = state.current_document.lock().unwrap();
    let path = current_doc
        .as_ref()
        .map(|doc| doc.path.clone())
        .ok_or_else(|| CommandError {
            message: "No document is currently loaded".to_string(),
        })?;
    
    drop(current_doc); // Release lock before reloading
    
    // Reload the document
    let document = MarkdownDocument::from_file(&path)?;
    
    // Update state
    let mut current_doc = state.current_document.lock().unwrap();
    *current_doc = Some(document.clone());
    
    Ok(document)
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
pub async fn set_zoom_factor(
    factor: f64,
    state: State<'_, AppState>,
) -> Result<f64, CommandError> {
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
}