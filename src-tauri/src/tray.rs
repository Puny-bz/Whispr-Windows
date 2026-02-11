use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let new_script = MenuItemBuilder::with_id("new_script", "New Script").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings...").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Whispr").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&new_script)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&settings)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&quit)
        .build()?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Whispr")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "new_script" => {
                    if let Some(w) = app.get_webview_window("main") {
                        w.show().ok();
                        w.set_focus().ok();
                        w.emit("new-script", ()).ok();
                    }
                }
                "settings" => {
                    crate::commands::window::open_settings_window(app.clone()).ok();
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {
                    // Handle recent script IDs
                    let id = event.id().as_ref().to_string();
                    if id.starts_with("recent_") {
                        let script_id = id.strip_prefix("recent_").unwrap_or("");
                        if let Some(w) = app.get_webview_window("main") {
                            w.show().ok();
                            w.set_focus().ok();
                            w.emit("open-script", script_id).ok();
                        }
                    }
                }
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    w.show().ok();
                    w.set_focus().ok();
                }
            }
        })
        .build(app)?;

    Ok(())
}
