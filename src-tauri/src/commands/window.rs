use crate::state::AppState;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
pub fn open_topbar_prompter(
    app: AppHandle,
    state: State<AppState>,
    script_id: String,
) -> Result<(), String> {
    // Close existing if any
    if let Some(w) = app.get_webview_window("topbar-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }

    // Get the script content
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let content: String = conn
        .query_row(
            "SELECT content FROM scripts WHERE id = ?1",
            rusqlite::params![script_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    drop(conn);

    let monitor = app
        .primary_monitor()
        .map_err(|e: tauri::Error| e.to_string())?
        .ok_or("No primary monitor found")?;
    let screen_width = monitor.size().width as f64 / monitor.scale_factor();

    let win = WebviewWindowBuilder::new(
        &app,
        "topbar-prompter",
        WebviewUrl::App("prompter-topbar.html".into()),
    )
    .title("Whispr Prompter")
    .inner_size(screen_width * 0.55, 100.0)
    .position(screen_width * 0.225, 0.0)
    .decorations(false)
    .always_on_top(true)
    .resizable(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    // Send script content after a short delay for the window to initialize
    let content_clone = content.clone();
    let script_id_clone = script_id.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        win.emit("load-script", serde_json::json!({
            "id": script_id_clone,
            "content": content_clone,
        }))
        .ok();
    });

    Ok(())
}

#[tauri::command]
pub fn open_floating_prompter(
    app: AppHandle,
    state: State<AppState>,
    script_id: String,
) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("floating-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }

    // Get the script content
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let content: String = conn
        .query_row(
            "SELECT content FROM scripts WHERE id = ?1",
            rusqlite::params![script_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    drop(conn);

    let win = WebviewWindowBuilder::new(
        &app,
        "floating-prompter",
        WebviewUrl::App("prompter-floating.html".into()),
    )
    .title("Whispr Prompter")
    .inner_size(480.0, 320.0)
    .center()
    .decorations(false)
    .always_on_top(true)
    .resizable(true)
    .skip_taskbar(true)
    .build()
    .map_err(|e: tauri::Error| e.to_string())?;

    let content_clone = content.clone();
    let script_id_clone = script_id.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        win.emit("load-script", serde_json::json!({
            "id": script_id_clone,
            "content": content_clone,
        }))
        .ok();
    });

    Ok(())
}

#[tauri::command]
pub fn close_prompter(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("topbar-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    if let Some(w) = app.get_webview_window("floating-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        w.set_focus().map_err(|e: tauri::Error| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings.html".into()))
        .title("Whispr Settings")
        .inner_size(640.0, 520.0)
        .center()
        .resizable(false)
        .build()
        .map_err(|e: tauri::Error| e.to_string())?;

    Ok(())
}
