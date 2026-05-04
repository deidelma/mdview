use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ThemeMode {
    Light,
    Dark,
    #[default]
    Auto,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ThemePalette {
    #[default]
    Default,
    IntelliJLight,
    IntelliJDark,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppPreferences {
    #[serde(default)]
    pub theme_mode: ThemeMode,
    #[serde(default)]
    pub theme_palette: ThemePalette,
    #[serde(default = "default_zoom_factor")]
    pub zoom_factor: f64,
    #[serde(default)]
    pub working_directory: Option<String>,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme_mode: ThemeMode::Auto,
            theme_palette: ThemePalette::Default,
            zoom_factor: default_zoom_factor(),
            working_directory: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WindowGeometry {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum WindowRole {
    #[default]
    Viewer,
    Main,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WindowSession {
    pub label: String,
    #[serde(default)]
    pub role: WindowRole,
    #[serde(default)]
    pub geometry: Option<WindowGeometry>,
    #[serde(default)]
    pub is_maximized: bool,
    #[serde(default)]
    pub is_fullscreen: bool,
    #[serde(default)]
    pub document_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct SessionSnapshot {
    #[serde(default)]
    pub windows: Vec<WindowSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct PersistedState {
    #[serde(default)]
    pub preferences: AppPreferences,
    #[serde(default)]
    pub session: SessionSnapshot,
}

pub fn default_zoom_factor() -> f64 {
    1.0
}

impl PersistedState {
    pub fn load(config_dir: &Path) -> Self {
        let settings_path = config_dir.join(SETTINGS_FILE_NAME);

        if !settings_path.exists() {
            return Self::default();
        }

        match fs::read_to_string(&settings_path) {
            Ok(contents) => match serde_json::from_str::<PersistedState>(&contents) {
                Ok(mut persisted) => {
                    persisted.preferences.zoom_factor =
                        clamp_zoom_factor(persisted.preferences.zoom_factor);
                    persisted
                }
                Err(error) => {
                    eprintln!("Failed to parse settings.json (corrupted): {}", error);
                    Self::default()
                }
            },
            Err(error) => {
                eprintln!("Failed to read settings.json: {}", error);
                Self::default()
            }
        }
    }

    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        if !config_dir.exists() {
            fs::create_dir_all(config_dir)
                .map_err(|error| format!("Failed to create config directory: {}", error))?;
        }

        let settings_path = config_dir.join(SETTINGS_FILE_NAME);
        let json = serde_json::to_string_pretty(self)
            .map_err(|error| format!("Failed to serialize settings: {}", error))?;

        fs::write(&settings_path, json)
            .map_err(|error| format!("Failed to write settings file: {}", error))?;

        Ok(())
    }
}

pub fn normalize_working_directory(path: &str) -> Option<String> {
    let candidate = PathBuf::from(path);
    let directory = if candidate.is_dir() {
        candidate
    } else {
        candidate.parent()?.to_path_buf()
    };

    if directory.as_os_str().is_empty() {
        return None;
    }

    Some(directory.display().to_string())
}

pub fn clamp_zoom_factor(factor: f64) -> f64 {
    factor.clamp(0.5, 3.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn load_returns_defaults_when_file_missing() {
        let temp_dir = tempdir().unwrap();

        assert_eq!(
            PersistedState::load(temp_dir.path()),
            PersistedState::default()
        );
    }

    #[test]
    fn save_and_load_round_trip() {
        let temp_dir = tempdir().unwrap();
        let persisted = PersistedState {
            preferences: AppPreferences {
                theme_mode: ThemeMode::Dark,
                theme_palette: ThemePalette::IntelliJDark,
                zoom_factor: 1.5,
                working_directory: Some("/tmp/docs".to_string()),
            },
            session: SessionSnapshot {
                windows: vec![WindowSession {
                    label: "main".to_string(),
                    role: WindowRole::Main,
                    geometry: Some(WindowGeometry {
                        x: 10,
                        y: 20,
                        width: 1200,
                        height: 800,
                    }),
                    is_maximized: false,
                    is_fullscreen: false,
                    document_path: Some("/tmp/docs/guide.md".to_string()),
                }],
            },
        };

        persisted.save(temp_dir.path()).unwrap();

        assert_eq!(PersistedState::load(temp_dir.path()), persisted);
    }

    #[test]
    fn load_tolerates_missing_fields() {
        let temp_dir = tempdir().unwrap();
        fs::write(
            temp_dir.path().join(SETTINGS_FILE_NAME),
            r#"{"preferences":{"theme_mode":"light"}}"#,
        )
        .unwrap();

        let loaded = PersistedState::load(temp_dir.path());
        assert_eq!(loaded.preferences.theme_mode, ThemeMode::Light);
        assert_eq!(loaded.preferences.theme_palette, ThemePalette::Default);
        assert_eq!(loaded.preferences.zoom_factor, 1.0);
        assert!(loaded.session.windows.is_empty());
    }

    #[test]
    fn normalize_working_directory_uses_parent_for_file_paths() {
        assert_eq!(
            normalize_working_directory("/Users/example/docs/guide.md"),
            Some("/Users/example/docs".to_string())
        );
    }

    #[test]
    fn clamp_zoom_factor_enforces_limits() {
        assert_eq!(clamp_zoom_factor(0.25), 0.5);
        assert_eq!(clamp_zoom_factor(1.25), 1.25);
        assert_eq!(clamp_zoom_factor(4.0), 3.0);
    }
}
