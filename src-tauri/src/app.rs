use crate::commands;
use crate::state::AppState;

/// Runs the Tauri application.
/// 
/// This function initializes the application state and registers all commands.
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::open_document,
            commands::reload_document,
            commands::set_zoom_factor,
            commands::get_zoom_factor,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
