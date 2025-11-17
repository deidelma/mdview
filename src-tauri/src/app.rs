use crate::commands;
use crate::md::MarkdownDocument;
use crate::menu;
use crate::state::AppState;
use tauri::{Emitter, Manager};

/// Runs the Tauri application.
/// 
/// This function initializes the application state and registers all commands.
/// If an initial file path is provided, it loads that file during setup.
/// 
/// # Arguments
/// 
/// * `initial_file` - Optional path to a Markdown file to load at startup
pub fn run(initial_file: Option<String>) {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .setup(move |app| {
            let app_handle = app.handle().clone();
            
            // Build and set the menu
            let menu = menu::build_menu(&app_handle)
                .expect("Failed to build menu");
            app.set_menu(menu)
                .expect("Failed to set menu");
            
            // Setup menu event handlers
            menu::setup_menu_handlers(&app_handle);
            
            // Load initial file if provided
            if let Some(file_path) = initial_file {
                let state = app.state::<AppState>();
                
                // Load the document
                match MarkdownDocument::from_file(&file_path) {
                    Ok(document) => {
                        // Update state
                        let mut current_doc = state.current_document.lock().unwrap();
                        *current_doc = Some(document.clone());
                        drop(current_doc);
                        
                        // Emit event to frontend with the loaded document
                        if let Err(e) = app_handle.emit("document-loaded", &document) {
                            eprintln!("Failed to emit document-loaded event: {}", e);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to load initial file '{}': {}", file_path, e);
                        // Emit error event to frontend
                        if let Err(emit_err) = app_handle.emit("document-load-error", e.to_string()) {
                            eprintln!("Failed to emit error event: {}", emit_err);
                        }
                    }
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_document,
            commands::reload_document,
            commands::set_zoom_factor,
            commands::get_zoom_factor,
            commands::get_current_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
