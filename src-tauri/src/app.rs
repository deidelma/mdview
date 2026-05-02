use crate::commands;
use crate::history::FileHistory;
use crate::launch;
use crate::menu;
use crate::state::AppState;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{
    DragDropEvent, Manager, RunEvent, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

const MAIN_WINDOW_LABEL: &str = "main";
static APP_READY: AtomicBool = AtomicBool::new(false);
static PENDING_OPENED_PATH: OnceLock<Mutex<Option<String>>> = OnceLock::new();

fn pending_opened_path() -> &'static Mutex<Option<String>> {
    PENDING_OPENED_PATH.get_or_init(|| Mutex::new(None))
}

fn stash_opened_path(path: String) {
    let mut pending_path = pending_opened_path().lock().unwrap();
    *pending_path = Some(path);
}

fn take_stashed_opened_path() -> Option<String> {
    pending_opened_path().lock().unwrap().take()
}

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

enum LaunchDocumentTarget {
    Existing(String),
    Draft(String),
}

fn suggest_markdown_file_name(path: &Path) -> String {
    match path.file_stem().and_then(|stem| stem.to_str()) {
        Some(stem) if !stem.is_empty() => format!("{}.md", stem),
        _ => "untitled.md".to_string(),
    }
}

fn prompt_for_valid_new_document_path(app: &tauri::AppHandle, initial_path: &Path) -> Option<String> {
    let mut candidate = initial_path.to_path_buf();

    loop {
        if launch::is_valid_new_document_path(&candidate) {
            return Some(candidate.display().to_string());
        }

        let choose_new_name = app
            .dialog()
            .message(format!(
                "The file name '{}' cannot be used for a new Markdown document. New files must have no extension or end with .md.",
                candidate.display()
            ))
            .title("Invalid Markdown File Name")
            .kind(MessageDialogKind::Warning)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Choose Name".to_string(),
                "Quit".to_string(),
            ))
            .blocking_show();

        if !choose_new_name {
            return None;
        }

        let mut dialog = app
            .dialog()
            .file()
            .set_title("Choose a Markdown file name")
            .add_filter("Markdown", &["md"])
            .set_file_name(suggest_markdown_file_name(&candidate));

        if let Some(parent) = candidate.parent().filter(|parent| !parent.as_os_str().is_empty()) {
            dialog = dialog.set_directory(parent);
        }

        let selected = dialog.blocking_save_file()?;
        candidate = selected.into_path().ok()?;
    }
}

fn resolve_launch_document_target(app: &tauri::AppHandle, path: &str) -> Option<LaunchDocumentTarget> {
    let path = PathBuf::from(path);

    if path.exists() {
        return launch::is_markdown_file(&path)
            .then(|| LaunchDocumentTarget::Existing(path.display().to_string()));
    }

    if launch::is_valid_new_document_path(&path) {
        return Some(LaunchDocumentTarget::Draft(path.display().to_string()));
    }

    let app_handle = app.clone();
    let candidate = path.clone();
    std::thread::spawn(move || prompt_for_valid_new_document_path(&app_handle, &candidate))
        .join()
        .ok()
        .flatten()
        .map(LaunchDocumentTarget::Draft)
}

fn set_draft_and_emit_document(app: &tauri::AppHandle, window_label: &str, path: &str) {
    let state = app.state::<AppState>();
    let document = commands::create_unsaved_document_into_state(state.inner(), window_label, path);

    if let Some(window) = app.get_webview_window(window_label) {
        commands::emit_document_loaded(&window, &document);
    }
}

fn load_launch_document(app: &tauri::AppHandle, window_label: &str, path: &str) -> bool {
    match resolve_launch_document_target(app, path) {
        Some(LaunchDocumentTarget::Existing(path)) => {
            load_and_emit_document(app, window_label, &path);
            true
        }
        Some(LaunchDocumentTarget::Draft(path)) => {
            set_draft_and_emit_document(app, window_label, &path);
            true
        }
        None => false,
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

fn select_opened_markdown_path(urls: &[Url]) -> Option<String> {
    urls.iter().find_map(|url| {
        let path = url.to_file_path().ok()?;
        launch::is_markdown_file(&path).then(|| path.display().to_string())
    })
}

fn handle_opened_path(app: &tauri::AppHandle, path: &str) {
    if !APP_READY.load(Ordering::SeqCst) {
        stash_opened_path(path.to_string());
        return;
    }

    if let Some(window_label) = existing_window_label(app) {
        if load_launch_document(app, &window_label, path) {
            focus_existing_window(app);
        }
    } else {
        stash_opened_path(path.to_string());
    }
}

fn schedule_opened_urls(app: &tauri::AppHandle, urls: &[Url]) {
    let Some(path) = select_opened_markdown_path(urls) else {
        return;
    };

    let dispatch_handle = app.clone();
    let worker_handle = app.clone();

    if let Err(error) = dispatch_handle.run_on_main_thread(move || {
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            handle_opened_path(&worker_handle, &path);
        }));

        if result.is_err() {
            eprintln!("Failed to handle macOS opened-file event without panicking");
        }
    }) {
        eprintln!("Failed to schedule macOS opened-file event: {}", error);
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
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let (Some(file_path), Some(window_label)) = (
                launch::select_relaunch_file(&argv),
                existing_window_label(app),
            ) {
                if !load_launch_document(app, &window_label, &file_path) {
                    app.exit(0);
                    return;
                }
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

            APP_READY.store(true, Ordering::SeqCst);

            // Load initial file if provided
            if let Some(file_path) = initial_file.or_else(take_stashed_opened_path) {
                if !load_launch_document(&app_handle, MAIN_WINDOW_LABEL, &file_path) {
                    app_handle.exit(0);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_about_info,
            commands::open_document,
            commands::parse_markdown,
            commands::reload_document,
            commands::save_document,
            commands::set_zoom_factor,
            commands::get_zoom_factor,
            commands::get_current_document,
            commands::get_navigation_state,
            commands::navigate_previous,
            commands::navigate_next,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let RunEvent::Opened { urls } = event {
            schedule_opened_urls(app_handle, &urls);
        }
    });
}
