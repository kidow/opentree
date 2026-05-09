use opentree_core::{build::build, config::Config};
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct DeployResult {
    pub url: String,
    pub id: String,
    pub state: String,
}

#[derive(Serialize)]
struct VercelFile {
    file: String,
    data: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VercelDeployBody {
    name: String,
    files: Vec<VercelFile>,
    project_settings: VercelProjectSettings,
    target: String,
}

#[derive(Serialize)]
struct VercelProjectSettings {
    framework: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VercelDeployResponse {
    id: String,
    url: String,
    ready_state: Option<String>,
}

pub async fn deploy_vercel(
    config: &Config,
    token: &str,
    project_name: &str,
) -> Result<DeployResult, String> {
    let output = build(config).map_err(|e| format!("빌드 오류: {e}"))?;

    let files = vec![
        VercelFile { file: "index.html".to_string(), data: output.index_html },
        VercelFile { file: "favicon.svg".to_string(), data: output.favicon_svg },
    ];

    let body = VercelDeployBody {
        name: project_name.to_string(),
        files,
        project_settings: VercelProjectSettings { framework: None },
        target: "production".to_string(),
    };

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.vercel.com/v13/deployments")
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;

    if !status.is_success() {
        let err: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let msg = err["error"]["message"]
            .as_str()
            .unwrap_or(&text)
            .to_string();
        return Err(format!("Vercel 오류 ({status}): {msg}"));
    }

    let deploy: VercelDeployResponse =
        serde_json::from_str(&text).map_err(|e| format!("응답 파싱 오류: {e}"))?;

    Ok(DeployResult {
        url: format!("https://{}", deploy.url),
        id: deploy.id,
        state: deploy.ready_state.unwrap_or_else(|| "BUILDING".to_string()),
    })
}

pub async fn check_deploy_state(token: &str, deploy_id: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("https://api.vercel.com/v13/deployments/{deploy_id}"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(val["readyState"].as_str().unwrap_or("UNKNOWN").to_string())
}

pub fn token_file_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("앱 데이터 디렉토리 오류: {e}"))?;
    Ok(data_dir.join("tokens.json"))
}

pub fn load_token(app_handle: &tauri::AppHandle, provider: &str) -> Result<Option<String>, String> {
    let path = token_file_path(app_handle)?;
    if !path.exists() { return Ok(None); }
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let val: serde_json::Value = serde_json::from_str(&json).unwrap_or_default();
    Ok(val[provider].as_str().map(|s| s.to_string()))
}

pub fn save_token(app_handle: &tauri::AppHandle, provider: &str, token: &str) -> Result<(), String> {
    let path = token_file_path(app_handle)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut val: serde_json::Value = if path.exists() {
        let json = std::fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&json).unwrap_or_default()
    } else {
        serde_json::json!({})
    };
    val[provider] = serde_json::Value::String(token.to_string());
    std::fs::write(&path, serde_json::to_string_pretty(&val).unwrap())
        .map_err(|e| e.to_string())
}
