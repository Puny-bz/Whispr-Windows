use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub words_per_minute: Option<f64>,
    pub last_practice_duration: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    // Top bar specific
    pub notch_font_size: f64,
    pub notch_scroll_speed: f64,
    pub notch_width_percent: f64,
    pub notch_height: f64,
    pub notch_font_family: String,
    pub notch_opacity: f64,
    pub notch_glow_style: String,
    pub notch_position: String,
    pub notch_line_count: u32,
    pub notch_show_timer: bool,

    // Floating specific
    pub floating_font_size: f64,
    pub floating_scroll_speed: f64,
    pub floating_font_family: String,
    pub floating_theme: String,
    pub text_color_hex: String,
    pub mirror_mode: bool,

    // General
    pub countdown_seconds: u32,
    pub prompter_mode: String,
    pub show_menu_bar_icon: bool,
    pub appearance_mode: String,
    pub end_action: String,
    pub target_min_wpm: f64,
    pub target_max_wpm: f64,
    pub voice_scroll_enabled: bool,
    pub content_protected: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            notch_font_size: 20.0,
            notch_scroll_speed: 50.0,
            notch_width_percent: 55.0,
            notch_height: 100.0,
            notch_font_family: "System".into(),
            notch_opacity: 0.92,
            notch_glow_style: "rainbow".into(),
            notch_position: "top".into(),
            notch_line_count: 2,
            notch_show_timer: true,

            floating_font_size: 32.0,
            floating_scroll_speed: 50.0,
            floating_font_family: "System".into(),
            floating_theme: "dark".into(),
            text_color_hex: "#FFFFFF".into(),
            mirror_mode: false,

            countdown_seconds: 3,
            prompter_mode: "notch".into(),
            show_menu_bar_icon: true,
            appearance_mode: "dark".into(),
            end_action: "stop".into(),
            target_min_wpm: 130.0,
            target_max_wpm: 170.0,
            voice_scroll_enabled: false,
            content_protected: false,
        }
    }
}
