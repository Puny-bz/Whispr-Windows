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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState::new())
        .setup(|app| {
            tray::setup_tray(app.handle())?;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Whispr");
}
