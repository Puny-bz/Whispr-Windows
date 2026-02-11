use crate::models::Settings;
use std::path::PathBuf;

fn settings_path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("Whispr").join("settings.json")
}

#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    let path = settings_path();
    if path.exists() {
        let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&data).map_err(|e| e.to_string())
    } else {
        let settings = Settings::default();
        save_settings(settings.clone())?;
        Ok(settings)
    }
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_setting(key: String, value: String) -> Result<Settings, String> {
    let mut settings = get_settings()?;

    match key.as_str() {
        "notch_font_size" => settings.notch_font_size = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "notch_scroll_speed" => settings.notch_scroll_speed = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "notch_width_percent" => settings.notch_width_percent = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "notch_height" => settings.notch_height = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "notch_font_family" => settings.notch_font_family = value,
        "notch_opacity" => settings.notch_opacity = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "notch_glow_style" => settings.notch_glow_style = value,
        "notch_position" => settings.notch_position = value,
        "notch_line_count" => settings.notch_line_count = value.parse().map_err(|e: std::num::ParseIntError| e.to_string())?,
        "notch_show_timer" => settings.notch_show_timer = value.parse().map_err(|e: std::str::ParseBoolError| e.to_string())?,
        "floating_font_size" => settings.floating_font_size = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "floating_scroll_speed" => settings.floating_scroll_speed = value.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?,
        "floating_font_family" => settings.floating_font_family = value,
        "floating_theme" => settings.floating_theme = value,
        "text_color_hex" => settings.text_color_hex = value,
        "mirror_mode" => settings.mirror_mode = value.parse().map_err(|e: std::str::ParseBoolError| e.to_string())?,
        "countdown_seconds" => settings.countdown_seconds = value.parse().map_err(|e: std::num::ParseIntError| e.to_string())?,
        "prompter_mode" => settings.prompter_mode = value,
        "show_menu_bar_icon" => settings.show_menu_bar_icon = value.parse().map_err(|e: std::str::ParseBoolError| e.to_string())?,
        "appearance_mode" => settings.appearance_mode = value,
        "end_action" => settings.end_action = value,
        _ => return Err(format!("Unknown setting key: {}", key)),
    }

    save_settings(settings.clone())?;
    Ok(settings)
}
