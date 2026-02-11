use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};

#[tauri::command]
pub fn open_topbar_prompter(app: AppHandle) -> Result<(), String> {
    // Close existing if any
    if let Some(w) = app.get_webview_window("topbar-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }

    let monitor = app
        .primary_monitor()
        .map_err(|e: tauri::Error| e.to_string())?
        .ok_or("No primary monitor found")?;
    let screen_width = monitor.size().width as f64 / monitor.scale_factor();

    WebviewWindowBuilder::new(&app, "topbar-prompter", WebviewUrl::App("prompter-topbar.html".into()))
        .title("Whispr Prompter")
        .inner_size(screen_width * 0.55, 100.0)
        .position((screen_width * 0.225) as f64, 0.0)
        .decorations(false)
        .always_on_top(true)
        .resizable(false)
        .skip_taskbar(true)
        .build()
        .map_err(|e: tauri::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn open_floating_prompter(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("floating-prompter") {
        w.close().map_err(|e: tauri::Error| e.to_string())?;
    }

    WebviewWindowBuilder::new(&app, "floating-prompter", WebviewUrl::App("prompter-floating.html".into()))
        .title("Whispr Prompter")
        .inner_size(480.0, 320.0)
        .center()
        .decorations(false)
        .always_on_top(true)
        .resizable(true)
        .skip_taskbar(true)
        .build()
        .map_err(|e: tauri::Error| e.to_string())?;

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
