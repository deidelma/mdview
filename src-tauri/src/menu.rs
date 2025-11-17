use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Runtime,
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
    
    let about = MenuItemBuilder::with_id("about", "About mdview").build(app)?;
    
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;
    
    // File menu
    let file_menu = {
        #[cfg(target_os = "macos")]
        {
            // On macOS, File menu only has Open (Quit is in app menu)
            SubmenuBuilder::new(app, "File")
                .item(&open)
                .build()?
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            // On Windows/Linux, File menu has Open and Quit
            SubmenuBuilder::new(app, "File")
                .item(&open)
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
    
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&copy)
        .separator()
        .item(&search)
        .build()?;
    
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
            // On macOS, create app menu with About and Quit
            let app_menu = SubmenuBuilder::new(app, "mdview")
                .item(&about)
                .separator()
                .item(&quit)
                .build()?;
            
            MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .build()?
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            // On Windows/Linux, we have a separate Help menu with About
            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&about)
                .build()?;
            
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

/// Sets up menu event handlers.
///
/// This function registers a handler for all menu events, emitting corresponding
/// events to the frontend for processing. The frontend is responsible for the
/// actual implementation of menu actions.
pub fn setup_menu_handlers<R: Runtime>(app: &AppHandle<R>) {
    app.on_menu_event(move |app, event| {
        let event_id = event.id().as_ref();
        
        match event_id {
            "open" => {
                if let Err(e) = app.emit("menu-open", ()) {
                    eprintln!("Failed to emit menu-open event: {}", e);
                }
            }
            "quit" => {
                app.exit(0);
            }
            "copy" => {
                if let Err(e) = app.emit("menu-copy", ()) {
                    eprintln!("Failed to emit menu-copy event: {}", e);
                }
            }
            "search" => {
                if let Err(e) = app.emit("menu-search", ()) {
                    eprintln!("Failed to emit menu-search event: {}", e);
                }
            }
            "zoom-in" => {
                if let Err(e) = app.emit("menu-zoom-in", ()) {
                    eprintln!("Failed to emit menu-zoom-in event: {}", e);
                }
            }
            "zoom-out" => {
                if let Err(e) = app.emit("menu-zoom-out", ()) {
                    eprintln!("Failed to emit menu-zoom-out event: {}", e);
                }
            }
            "zoom-reset" => {
                if let Err(e) = app.emit("menu-zoom-reset", ()) {
                    eprintln!("Failed to emit menu-zoom-reset event: {}", e);
                }
            }
            "about" => {
                if let Err(e) = app.emit("menu-about", ()) {
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