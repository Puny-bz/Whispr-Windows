/// Read file content from a given path (for file import).
/// Falls back to lossy UTF-8 conversion if strict parsing fails.
#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(_) => {
            let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            Ok(String::from_utf8_lossy(&bytes).into_owned())
        }
    }
}

/// Prevent the system from going to sleep while prompter is active.
/// On Windows: SetThreadExecutionState. On macOS: IOKit (handled in Swift).
#[tauri::command]
pub fn prevent_sleep(prevent: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
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

    #[cfg(not(target_os = "windows"))]
    {
        let _ = prevent;
    }

    Ok(())
}
