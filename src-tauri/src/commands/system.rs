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
