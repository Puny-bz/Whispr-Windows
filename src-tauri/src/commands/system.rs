use tauri::{AppHandle, Manager};

/// Prevent the system from going to sleep while prompter is active.
/// On macOS: uses caffeinate-like behavior via IOKit (not available in pure Rust).
/// On Windows: uses SetThreadExecutionState.
/// Cross-platform fallback: Tauri doesn't have a built-in API, so we use
/// the prevent_display_sleep approach via a keep-alive timer in JS instead.
/// This command is a placeholder for platform-specific implementations.
#[tauri::command]
pub fn prevent_sleep(_app: AppHandle, prevent: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, use SetThreadExecutionState
        // ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        use std::os::raw::c_ulong;
        type EXECUTION_STATE = c_ulong;
        const ES_CONTINUOUS: EXECUTION_STATE = 0x80000000;
        const ES_SYSTEM_REQUIRED: EXECUTION_STATE = 0x00000001;
        const ES_DISPLAY_REQUIRED: EXECUTION_STATE = 0x00000002;

        extern "system" {
            fn SetThreadExecutionState(esFlags: EXECUTION_STATE) -> EXECUTION_STATE;
        }

        unsafe {
            if prevent {
                SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED);
            } else {
                SetThreadExecutionState(ES_CONTINUOUS);
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, we'd use IOPMAssertionCreateWithName
        // For now, the JS side handles this via wakeLock API
        let _ = prevent;
    }

    #[cfg(target_os = "linux")]
    {
        let _ = prevent;
    }

    Ok(())
}

/// Enable/disable content protection (screen share guard)
/// Prevents the window content from being captured in screenshots/recordings
#[tauri::command]
pub fn set_content_protected(app: AppHandle, protected: bool) -> Result<(), String> {
    // Apply to all prompter windows
    if let Some(win) = app.get_webview_window("floating-prompter") {
        win.set_content_protected(protected)
            .map_err(|e: tauri::Error| e.to_string())?;
    }
    if let Some(win) = app.get_webview_window("topbar-prompter") {
        win.set_content_protected(protected)
            .map_err(|e: tauri::Error| e.to_string())?;
    }
    Ok(())
}
