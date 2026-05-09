use opentree_core::{
    build::{build, write_output},
    config::Config,
};
use std::path::Path;
use tauri::command;

#[command]
fn default_config() -> Result<Config, String> {
    Ok(Config::default_config())
}

#[command]
fn load_config(path: String) -> Result<Config, String> {
    let config_path = Path::new(&path).join("opentree.config.json");
    let json = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("파일을 읽을 수 없습니다: {e}"))?;
    Config::from_json(&json).map_err(|e| format!("설정 파싱 오류: {e}"))
}

#[command]
fn save_config(path: String, config: Config) -> Result<(), String> {
    let config_path = Path::new(&path).join("opentree.config.json");
    let json = config.to_json().map_err(|e| format!("직렬화 오류: {e}"))?;
    std::fs::write(&config_path, json).map_err(|e| format!("저장 오류: {e}"))
}

#[command]
fn export_site(config: Config, dest: String) -> Result<(), String> {
    let output = build(&config).map_err(|e| format!("빌드 오류: {e}"))?;
    write_output(&output, Path::new(&dest)).map_err(|e| format!("출력 오류: {e}"))
}

#[command]
fn validate_config(config: Config) -> Vec<String> {
    opentree_core::validate::validate(&config)
        .into_iter()
        .map(|e| e.to_string())
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            default_config,
            load_config,
            save_config,
            export_site,
            validate_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
