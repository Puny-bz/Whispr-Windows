use crate::db::Database;

pub struct AppState {
    pub db: Database,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            db: Database::new().expect("Failed to initialize database"),
        }
    }
}
