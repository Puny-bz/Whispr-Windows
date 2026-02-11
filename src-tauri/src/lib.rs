mod commands;
mod db;
mod models;
mod state;
mod tray;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .build(),
        )
        .manage(AppState::new())
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            setup_global_shortcuts(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scripts::get_all_scripts,
            commands::scripts::create_script,
            commands::scripts::update_script,
            commands::scripts::delete_script,
            commands::scripts::get_recent_scripts,
            commands::scripts::update_practice_stats,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::settings::update_setting,
            commands::window::open_topbar_prompter,
            commands::window::open_floating_prompter,
            commands::window::close_prompter,
            commands::window::open_settings_window,
            commands::system::prevent_sleep,
            commands::system::set_content_protected,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Whispr");
}

fn setup_global_shortcuts(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};
    use tauri::Emitter;

    // Ctrl+Shift+W — toggle prompter
    let toggle_shortcut: Shortcut = "CmdOrCtrl+Shift+W".parse()?;
    // Ctrl+Shift+P — pause/resume
    let pause_shortcut: Shortcut = "CmdOrCtrl+Shift+P".parse()?;

    let app_handle = app.clone();
    app.global_shortcut().on_shortcuts(
        [toggle_shortcut, pause_shortcut],
        move |_app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if shortcut == &toggle_shortcut {
                    app_handle.emit("global-toggle-prompter", ()).ok();
                } else if shortcut == &pause_shortcut {
                    app_handle.emit("global-pause-prompter", ()).ok();
                }
            }
        },
    )?;

    Ok(())
}
