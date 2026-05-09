mod publish;

use opentree_core::{
    build::{build, write_output},
    config::Config,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportedLink {
    pub title: String,
    pub url: String,
}

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
fn parse_import_file(file_path: String) -> Result<Vec<ImportedLink>, String> {
    let json = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("파일 읽기 오류: {e}"))?;

    let value: serde_json::Value =
        serde_json::from_str(&json).map_err(|_| "유효한 JSON 파일이 아닙니다.".to_string())?;

    let arr = match &value {
        serde_json::Value::Array(a) => a.clone(),
        serde_json::Value::Object(o) => match o.get("links") {
            Some(serde_json::Value::Array(a)) => a.clone(),
            _ => return Err("JSON은 배열이거나 links 배열을 포함한 객체여야 합니다.".to_string()),
        },
        _ => return Err("JSON은 배열이거나 links 배열을 포함한 객체여야 합니다.".to_string()),
    };

    let links = arr
        .iter()
        .enumerate()
        .map(|(i, v)| {
            let title = v.get("title")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();
            let url = v.get("url")
                .and_then(|u| u.as_str())
                .ok_or_else(|| format!("링크 #{}: url 필드가 없습니다.", i + 1))?
                .to_string();
            Ok(ImportedLink { title, url })
        })
        .collect::<Result<Vec<_>, String>>()?;

    if links.is_empty() {
        return Err("가져올 링크가 없습니다.".to_string());
    }

    Ok(links)
}

#[command]
fn get_token(app: tauri::AppHandle, provider: String) -> Result<Option<String>, String> {
    publish::load_token(&app, &provider)
}

#[command]
fn set_token(app: tauri::AppHandle, provider: String, token: String) -> Result<(), String> {
    publish::save_token(&app, &provider, &token)
}

#[command]
async fn deploy_vercel(
    app: tauri::AppHandle,
    config: Config,
    project_name: String,
) -> Result<publish::DeployResult, String> {
    let token = publish::load_token(&app, "vercel")?
        .ok_or_else(|| "Vercel 토큰이 없습니다. 먼저 토큰을 저장하세요.".to_string())?;
    publish::deploy_vercel(&config, &token, &project_name).await
}

#[command]
async fn check_deploy_state(
    app: tauri::AppHandle,
    deploy_id: String,
) -> Result<String, String> {
    let token = publish::load_token(&app, "vercel")?
        .ok_or_else(|| "Vercel 토큰이 없습니다.".to_string())?;
    publish::check_deploy_state(&token, &deploy_id).await
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
            parse_import_file,
            get_token,
            set_token,
            deploy_vercel,
            check_deploy_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
