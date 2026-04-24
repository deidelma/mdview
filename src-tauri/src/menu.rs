use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Manager, Runtime, WebviewWindow,
};

/// Creates and builds the native application menu.
///
/// This function constructs a platform-native menu bar with the following structure:
/// - macOS: App menu (About, Quit), File (Open), Edit (Copy, Search), View (Zoom controls)
/// - Windows/Linux: File (Open, Quit), Edit (Copy, Search), View (Zoom controls), Help (About)
///
/// Menu actions emit events to the frontend for handling.
pub fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<tauri::menu::Menu<R>> {
    let open = MenuItemBuilder::with_id("open", "Open...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    let prev_file = MenuItemBuilder::with_id("prev-file", "Previous File")
        .accelerator("CmdOrCtrl+Left")
        .build(app)?;

    let next_file = MenuItemBuilder::with_id("next-file", "Next File")
        .accelerator("CmdOrCtrl+Right")
        .build(app)?;

    #[cfg(target_os = "macos")]
    let about = MenuItemBuilder::with_id("about", "About mdview").build(app)?;

    #[cfg(not(target_os = "macos"))]
    let about = MenuItemBuilder::with_id("about", "About mdview").build(app)?;

    #[cfg(not(target_os = "macos"))]
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    // File menu
    let file_menu = {
        #[cfg(target_os = "macos")]
        {
            let close_window =
                tauri::menu::PredefinedMenuItem::close_window(app, Some("Close Window"))?;

            SubmenuBuilder::new(app, "File")
                .item(&open)
                .separator()
                .item(&prev_file)
                .item(&next_file)
                .separator()
                .item(&close_window)
                .build()?
        }

        #[cfg(not(target_os = "macos"))]
        {
            // On Windows/Linux, File menu has Open and Quit
            SubmenuBuilder::new(app, "File")
                .item(&open)
                .separator()
                .item(&prev_file)
                .item(&next_file)
                .separator()
                .item(&quit)
                .build()?
        }
    };

    // Edit menu
    let copy = MenuItemBuilder::with_id("copy", "Copy")
        .accelerator("CmdOrCtrl+C")
        .build(app)?;

    let search = MenuItemBuilder::with_id("search", "Search")
        .accelerator("CmdOrCtrl+F")
        .build(app)?;

    let edit_menu = {
        #[cfg(target_os = "macos")]
        {
            let select_all = tauri::menu::PredefinedMenuItem::select_all(app, Some("Select All"))?;

            SubmenuBuilder::new(app, "Edit")
                .item(&copy)
                .item(&select_all)
                .separator()
                .item(&search)
                .build()?
        }

        #[cfg(not(target_os = "macos"))]
        {
            SubmenuBuilder::new(app, "Edit")
                .item(&copy)
                .separator()
                .item(&search)
                .build()?
        }
    };

    // View menu
    let zoom_in = MenuItemBuilder::with_id("zoom-in", "Zoom In")
        .accelerator("CmdOrCtrl+Plus")
        .build(app)?;

    let zoom_out = MenuItemBuilder::with_id("zoom-out", "Zoom Out")
        .accelerator("CmdOrCtrl+Minus")
        .build(app)?;

    let zoom_reset = MenuItemBuilder::with_id("zoom-reset", "Reset Zoom")
        .accelerator("CmdOrCtrl+0")
        .build(app)?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&zoom_in)
        .item(&zoom_out)
        .separator()
        .item(&zoom_reset)
        .build()?;

    // Build complete menu
    let menu = {
        #[cfg(target_os = "macos")]
        {
            use tauri::menu::PredefinedMenuItem;
            let services = PredefinedMenuItem::services(app, Some("Services"))?;
            let hide = PredefinedMenuItem::hide(app, Some("Hide mdview"))?;
            let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
            let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
            let quit = PredefinedMenuItem::quit(app, Some("Quit mdview"))?;
            let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
            let close_window = PredefinedMenuItem::close_window(app, Some("Close Window"))?;

            let app_menu = SubmenuBuilder::new(app, "mdview")
                .item(&about)
                .separator()
                .item(&services)
                .separator()
                .item(&hide)
                .item(&hide_others)
                .item(&show_all)
                .separator()
                .item(&quit)
                .build()?;

            let window_menu = SubmenuBuilder::new(app, "Window")
                .item(&minimize)
                .item(&close_window)
                .build()?;

            MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .build()?
        }

        #[cfg(not(target_os = "macos"))]
        {
            // On Windows/Linux, we have a separate Help menu with About
            let help_menu = SubmenuBuilder::new(app, "Help").item(&about).build()?;

            MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&help_menu)
                .build()?
        }
    };

    Ok(menu)
}

/// Sets up menu event handlers for a specific window.
pub fn setup_menu_handlers<R: Runtime>(window: &WebviewWindow<R>) {
    window.on_menu_event(move |window, event| {
        let event_id = event.id().as_ref();

        match event_id {
            "open" => {
                if let Err(e) = window.emit("menu-open", ()) {
                    eprintln!("Failed to emit menu-open event: {}", e);
                }
            }
            "prev-file" => {
                if let Err(e) = window.emit("menu-prev-file", ()) {
                    eprintln!("Failed to emit menu-prev-file event: {}", e);
                }
            }
            "next-file" => {
                if let Err(e) = window.emit("menu-next-file", ()) {
                    eprintln!("Failed to emit menu-next-file event: {}", e);
                }
            }
            "quit" => {
                window.app_handle().exit(0);
            }
            "copy" => {
                if let Err(e) = window.emit("menu-copy", ()) {
                    eprintln!("Failed to emit menu-copy event: {}", e);
                }
            }
            "search" => {
                if let Err(e) = window.emit("menu-search", ()) {
                    eprintln!("Failed to emit menu-search event: {}", e);
                }
            }
            "zoom-in" => {
                if let Err(e) = window.emit("menu-zoom-in", ()) {
                    eprintln!("Failed to emit menu-zoom-in event: {}", e);
                }
            }
            "zoom-out" => {
                if let Err(e) = window.emit("menu-zoom-out", ()) {
                    eprintln!("Failed to emit menu-zoom-out event: {}", e);
                }
            }
            "zoom-reset" => {
                if let Err(e) = window.emit("menu-zoom-reset", ()) {
                    eprintln!("Failed to emit menu-zoom-reset event: {}", e);
                }
            }
            "about" => {
                if let Err(e) = window.emit("menu-about", ()) {
                    eprintln!("Failed to emit menu-about event: {}", e);
                }
            }
            _ => {
                eprintln!("Unknown menu event: {}", event_id);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_menu_module_exists() {
        // This test just ensures the module compiles
        assert!(true);
    }
}
