use crate::models::Script;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_all_scripts(state: State<AppState>) -> Result<Vec<Script>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM scripts ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let scripts = stmt
        .query_map([], |row| {
            Ok(Script {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(scripts)
}

#[tauri::command]
pub fn create_script(state: State<AppState>, title: String, content: String) -> Result<Script, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO scripts (id, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, title, content, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(Script {
        id,
        title,
        content,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_script(
    state: State<AppState>,
    id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE scripts SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![title, content, now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_script(state: State<AppState>, id: String) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM scripts WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_recent_scripts(state: State<AppState>, limit: u32) -> Result<Vec<Script>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, title, content, created_at, updated_at FROM scripts ORDER BY updated_at DESC LIMIT ?1")
        .map_err(|e| e.to_string())?;

    let scripts = stmt
        .query_map(rusqlite::params![limit], |row| {
            Ok(Script {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(scripts)
}

