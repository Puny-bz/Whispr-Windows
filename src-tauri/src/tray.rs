use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};
use crate::state::AppState;

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray_menu(app)?;

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

fn build_tray_menu(app: &AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let new_script = MenuItemBuilder::with_id("new_script", "New Script").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "Settings...").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Whispr").build(app)?;

    let mut builder = MenuBuilder::new(app);

    // Add recent scripts from DB
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(conn) = state.db.conn.lock() {
            let recent = get_recent_titles(&conn);
            if !recent.is_empty() {
                for (id, title) in &recent {
                    let menu_id = format!("recent_{}", id);
                    let truncated = if title.len() > 30 {
                        format!("{}...", &title[..27])
                    } else {
                        title.clone()
                    };
                    let item = MenuItemBuilder::with_id(menu_id, truncated).build(app)?;
                    builder = builder.item(&item);
                }
                builder = builder.item(&PredefinedMenuItem::separator(app)?);
            }
        }
    }

    builder = builder
        .item(&new_script)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&settings)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&quit);

    Ok(builder.build()?)
}

fn get_recent_titles(conn: &rusqlite::Connection) -> Vec<(String, String)> {
    let mut stmt = match conn.prepare("SELECT id, title FROM scripts ORDER BY updated_at DESC LIMIT 3") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    stmt.query_map([], |row: &rusqlite::Row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })
    .map(|rows| rows.filter_map(|r: Result<(String, String), _>| r.ok()).collect())
    .unwrap_or_default()
}
