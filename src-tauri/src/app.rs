use crate::commands;
use crate::history::FileHistory;
use crate::launch;
use crate::menu;
use crate::state::AppState;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{DragDropEvent, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

const MAIN_WINDOW_LABEL: &str = "main";

fn focus_window(window: &WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn existing_window_label(app: &tauri::AppHandle) -> Option<String> {
    app.get_webview_window(MAIN_WINDOW_LABEL)
        .map(|window| window.label().to_string())
        .or_else(|| {
            app.webview_windows()
                .values()
                .next()
                .map(|window| window.label().to_string())
        })
}

fn focus_existing_window(app: &tauri::AppHandle) {
    if let Some(window) = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .or_else(|| app.webview_windows().values().next().cloned())
    {
        focus_window(&window);
    }
}

fn emit_load_error_to_window(app: &tauri::AppHandle, window_label: &str, message: &str) {
    if let Some(window) = app.get_webview_window(window_label) {
        commands::emit_document_error_message(&window, message);
    } else {
        eprintln!("{}", message);
    }
}

fn load_and_emit_document(app: &tauri::AppHandle, window_label: &str, path: &str) {
    let state = app.state::<AppState>();

    match commands::load_document_into_state(app, state.inner(), window_label, path) {
        Ok(document) => {
            if let Some(window) = app.get_webview_window(window_label) {
                commands::emit_document_loaded(&window, &document);
            }
        }
        Err(error) => {
            if let Some(window) = app.get_webview_window(window_label) {
                commands::emit_document_load_error(&window, path, &error);
            } else {
                eprintln!("Failed to load file '{}': {}", path, error);
            }
        }
    }
}

fn register_window_handlers(window: &WebviewWindow) {
    menu::setup_menu_handlers(window);

    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();
    window.on_window_event(move |event| match event {
        tauri::WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) => {
            for path in paths.iter().filter(|path| launch::is_markdown_file(path)) {
                spawn_document_window(app_handle.clone(), window_label.clone(), path.clone());
            }
        }
        tauri::WindowEvent::CloseRequested { .. } => {
            let state = app_handle.state::<AppState>();
            state.clear_current_document(&window_label);
        }
        _ => {}
    });
}

fn spawn_document_window(app: tauri::AppHandle, source_window_label: String, path: PathBuf) {
    std::thread::spawn(move || {
        if let Err(error_message) = create_document_window(&app, &path) {
            emit_load_error_to_window(
                &app,
                &source_window_label,
                &format!(
                    "Failed to open dropped file '{}': {}",
                    path.display(),
                    error_message
                ),
            );
        }
    });
}

fn create_document_window(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    let state = app.state::<AppState>();
    let window_label = state.next_window_label();
    let path_string = path.display().to_string();

    commands::load_document_into_state(app, state.inner(), &window_label, &path_string)
        .map_err(|error| error.to_string())?;

    let window = WebviewWindowBuilder::new(app, &window_label, WebviewUrl::default())
        .title("mdview")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|error| {
            state.clear_current_document(&window_label);
            error.to_string()
        })?;

    register_window_handlers(&window);
    focus_window(&window);

    Ok(())
}

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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let (Some(file_path), Some(window_label)) = (
                launch::select_relaunch_file(&argv),
                existing_window_label(app),
            ) {
                load_and_emit_document(app, &window_label, &file_path);
            }
            focus_existing_window(app);
        }))
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // Load file history from config directory
            let file_history = if let Ok(config_dir) = app_handle.path().app_config_dir() {
                Arc::new(Mutex::new(FileHistory::load(&config_dir)))
            } else {
                Arc::new(Mutex::new(FileHistory::new()))
            };

            // Initialize application state with history
            app.manage(AppState::new(file_history.clone()));

            // Build and set the menu
            let menu = menu::build_menu(&app_handle).expect("Failed to build menu");
            app.set_menu(menu).expect("Failed to set menu");

            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                register_window_handlers(&window);
            }

            // Load initial file if provided
            if let Some(file_path) = initial_file {
                load_and_emit_document(&app_handle, MAIN_WINDOW_LABEL, &file_path);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_about_info,
            commands::open_document,
            commands::reload_document,
            commands::set_zoom_factor,
            commands::get_zoom_factor,
            commands::get_current_document,
            commands::get_navigation_state,
            commands::navigate_previous,
            commands::navigate_next,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
