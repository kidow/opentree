mod ai;
mod asset;
mod publish;

use opentree_core::{
    build::{build_with_time, write_output},
    config::Config,
};
use std::path::Path;
use tauri::command;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

fn now_iso() -> String {
    OffsetDateTime::now_utc().format(&Rfc3339).unwrap_or_default()
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
fn export_site(config: Config, dest: String, project_path: String) -> Result<(), String> {
    let now = now_iso();
    let output = build_with_time(&config, Some(&now)).map_err(|e| format!("빌드 오류: {e}"))?;
    write_output(&output, Path::new(&dest)).map_err(|e| format!("출력 오류: {e}"))?;

    let src_assets = Path::new(&project_path).join("assets");
    if src_assets.exists() {
        let dest_assets = Path::new(&dest).join("assets");
        std::fs::create_dir_all(&dest_assets)
            .map_err(|e| format!("assets 폴더 생성 오류: {e}"))?;
        for entry in std::fs::read_dir(&src_assets)
            .map_err(|e| format!("assets 읽기 오류: {e}"))?
        {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.path().is_file() {
                let dest_file = dest_assets.join(entry.file_name());
                std::fs::copy(entry.path(), &dest_file)
                    .map_err(|e| format!("파일 복사 오류: {e}"))?;
            }
        }
    }
    Ok(())
}

#[command]
fn validate_config(config: Config) -> Vec<String> {
    opentree_core::validate::validate(&config)
        .into_iter()
        .map(|e| e.to_string())
        .collect()
}

#[command]
fn import_asset(src_path: String, project_path: String, role: String) -> Result<String, String> {
    asset::import_asset(&src_path, &project_path, &role)
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
        "plausible" => {
            let conn: publish::PlausibleConnection =
                serde_json::from_str(&data).map_err(|_| "잘못된 연결 데이터".to_string())?;
            publish::verify_plausible(&conn).await
        }
        "anthropic" => ai::verify_anthropic(&data).await,
        "openai" => ai::verify_openai(&data).await,
        "unsplash" => publish::verify_unsplash(&data).await,
        _ => Err(format!("알 수 없는 provider: {provider}")),
    }
}

#[command]
async fn unsplash_search(query: String, page: u32) -> Result<Vec<publish::UnsplashPhoto>, String> {
    let token = publish::load_token("unsplash")?
        .ok_or_else(|| "Unsplash Access Key가 없습니다. Settings → 연결에서 추가하세요.".to_string())?;
    publish::unsplash_search(&token, &query, page).await
}

#[command]
async fn chat_send(
    provider: String,
    messages: Vec<ai::ChatMessage>,
    config: serde_json::Value,
) -> Result<ai::ChatResponse, String> {
    match provider.as_str() {
        "anthropic" => {
            let token = publish::load_token("anthropic")?
                .ok_or_else(|| "Anthropic API 키가 없습니다. Settings → 연결에서 추가하세요.".to_string())?;
            ai::chat_anthropic(&token, &messages, &config).await
        }
        "openai" => {
            let token = publish::load_token("openai")?
                .ok_or_else(|| "OpenAI API 키가 없습니다. Settings → 연결에서 추가하세요.".to_string())?;
            ai::chat_openai(&token, &messages, &config).await
        }
        _ => Err(format!("알 수 없는 provider: {provider}")),
    }
}

#[command]
async fn fetch_plausible_stats(
    site_id: String,
    period: String,
) -> Result<publish::PlausibleStats, String> {
    let raw = publish::load_token("plausible")?
        .ok_or_else(|| "Plausible 토큰이 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    let conn: publish::PlausibleConnection =
        serde_json::from_str(&raw).map_err(|_| "Plausible 연결 데이터 파싱 오류".to_string())?;
    publish::fetch_plausible_stats(&conn, &site_id, &period).await
}

// ── Deploy ───────────────────────────────────────────────────────────────────

#[command]
async fn deploy_vercel(
    config: Config,
    project_name: String,
    project_path: String,
) -> Result<publish::DeployResult, String> {
    let token = publish::load_token("vercel")?
        .ok_or_else(|| "Vercel 토큰이 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    publish::deploy_vercel(&config, &token, &project_name, &project_path).await
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
    project_path: String,
) -> Result<publish::DeployResult, String> {
    let raw = publish::load_token("cloudflare")?
        .ok_or_else(|| "Cloudflare 연결 정보가 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    let conn: publish::CfConnection =
        serde_json::from_str(&raw).map_err(|_| "Cloudflare 연결 데이터 파싱 오류".to_string())?;
    publish::deploy_cloudflare(&config, &conn, &project_name, &project_path).await
}

#[command]
async fn deploy_github_pages(
    config: Config,
    project_path: String,
) -> Result<publish::DeployResult, String> {
    let raw = publish::load_token("github")?
        .ok_or_else(|| "GitHub 연결 정보가 없습니다. Settings → Connections에서 연결하세요.".to_string())?;
    let conn: publish::GhConnection =
        serde_json::from_str(&raw).map_err(|_| "GitHub 연결 데이터 파싱 오류".to_string())?;
    publish::deploy_github_pages(&config, &conn, &project_path).await
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            default_config,
            load_config,
            save_config,
            export_site,
            validate_config,
            import_asset,
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
            fetch_plausible_stats,
            chat_send,
            unsplash_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
