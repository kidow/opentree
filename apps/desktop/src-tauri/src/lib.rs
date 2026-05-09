mod publish;

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

// ── Token / Connection ────────────────────────────────────────────────────────

#[command]
fn get_token(provider: String) -> Result<Option<String>, String> {
    publish::load_token(&provider)
}

#[command]
fn set_token(provider: String, token: String) -> Result<(), String> {
    publish::save_token(&provider, &token)
}

#[command]
fn delete_token(provider: String) -> Result<(), String> {
    publish::delete_token(&provider)
}

#[command]
async fn verify_connection(provider: String, data: String) -> Result<(), String> {
    match provider.as_str() {
        "vercel" => publish::verify_vercel(&data).await,
        "cloudflare" => {
            let conn: publish::CfConnection =
                serde_json::from_str(&data).map_err(|_| "잘못된 연결 데이터".to_string())?;
            publish::verify_cloudflare(&conn.token, &conn.account_id).await
        }
        "github" => {
            let conn: publish::GhConnection =
                serde_json::from_str(&data).map_err(|_| "잘못된 연결 데이터".to_string())?;
            publish::verify_github(&conn.token).await
        }
        _ => Err(format!("알 수 없는 provider: {provider}")),
    }
}

// ── Deploy ───────────────────────────────────────────────────────────────────

#[command]
async fn deploy_vercel(
    config: Config,
    project_name: String,
) -> Result<publish::DeployResult, String> {
    let token = publish::load_token("vercel")?
        .ok_or_else(|| "Vercel 토큰이 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    publish::deploy_vercel(&config, &token, &project_name).await
}

#[command]
async fn check_deploy_state(deploy_id: String) -> Result<String, String> {
    let token = publish::load_token("vercel")?
        .ok_or_else(|| "Vercel 토큰이 없습니다.".to_string())?;
    publish::check_vercel_deploy(&token, &deploy_id).await
}

#[command]
async fn deploy_cloudflare(
    config: Config,
    project_name: String,
) -> Result<publish::DeployResult, String> {
    let raw = publish::load_token("cloudflare")?
        .ok_or_else(|| "Cloudflare 연결 정보가 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    let conn: publish::CfConnection =
        serde_json::from_str(&raw).map_err(|_| "Cloudflare 연결 데이터 파싱 오류".to_string())?;
    publish::deploy_cloudflare(&config, &conn, &project_name).await
}

#[command]
async fn deploy_github_pages(config: Config) -> Result<publish::DeployResult, String> {
    let raw = publish::load_token("github")?
        .ok_or_else(|| "GitHub 연결 정보가 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    let conn: publish::GhConnection =
        serde_json::from_str(&raw).map_err(|_| "GitHub 연결 데이터 파싱 오류".to_string())?;
    publish::deploy_github_pages(&config, &conn).await
}

// ── Domain ───────────────────────────────────────────────────────────────────

#[command]
async fn add_domain(provider: String, project_name: String, domain: String) -> Result<(), String> {
    match provider.as_str() {
        "vercel" => {
            let token = publish::load_token("vercel")?
                .ok_or_else(|| "Vercel 토큰이 없습니다.".to_string())?;
            publish::add_vercel_domain(&token, &project_name, &domain).await
        }
        "cloudflare" => {
            let raw = publish::load_token("cloudflare")?
                .ok_or_else(|| "Cloudflare 연결 정보가 없습니다.".to_string())?;
            let conn: publish::CfConnection =
                serde_json::from_str(&raw).map_err(|_| "파싱 오류".to_string())?;
            publish::add_cloudflare_domain(&conn.token, &conn.account_id, &project_name, &domain).await
        }
        "github" => {
            let raw = publish::load_token("github")?
                .ok_or_else(|| "GitHub 연결 정보가 없습니다.".to_string())?;
            let conn: publish::GhConnection =
                serde_json::from_str(&raw).map_err(|_| "파싱 오류".to_string())?;
            publish::add_github_domain(&conn.token, &conn.repo, &domain).await
        }
        _ => Err(format!("알 수 없는 provider: {provider}")),
    }
}

#[command]
async fn check_domain(
    provider: String,
    project_name: String,
    domain: String,
) -> Result<publish::DomainStatus, String> {
    match provider.as_str() {
        "vercel" => {
            let token = publish::load_token("vercel")?
                .ok_or_else(|| "Vercel 토큰이 없습니다.".to_string())?;
            publish::check_vercel_domain(&token, &project_name, &domain).await
        }
        "cloudflare" => {
            let raw = publish::load_token("cloudflare")?
                .ok_or_else(|| "Cloudflare 연결 정보가 없습니다.".to_string())?;
            let conn: publish::CfConnection =
                serde_json::from_str(&raw).map_err(|_| "파싱 오류".to_string())?;
            publish::check_cloudflare_domain(&conn.token, &conn.account_id, &project_name, &domain).await
        }
        "github" => {
            let raw = publish::load_token("github")?
                .ok_or_else(|| "GitHub 연결 정보가 없습니다.".to_string())?;
            let conn: publish::GhConnection =
                serde_json::from_str(&raw).map_err(|_| "파싱 오류".to_string())?;
            publish::check_github_domain(&conn.token, &conn.repo, &domain).await
        }
        _ => Err(format!("알 수 없는 provider: {provider}")),
    }
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
            get_token,
            set_token,
            delete_token,
            verify_connection,
            deploy_vercel,
            check_deploy_state,
            deploy_cloudflare,
            deploy_github_pages,
            add_domain,
            check_domain,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
