use base64::Engine;
use keyring::Entry;
use opentree_core::{build::build, config::Config};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

// ── Keychain ─────────────────────────────────────────────────────────────────

const SERVICE: &str = "dev.kidow.opentree";

pub fn load_token(provider: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, provider).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn save_token(provider: &str, token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, provider).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())
}

pub fn delete_token(provider: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, provider).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// ── Asset helpers ─────────────────────────────────────────────────────────────

pub fn load_project_assets(project_path: &str) -> Vec<(String, Vec<u8>)> {
    let dir = std::path::Path::new(project_path).join("assets");
    if !dir.exists() { return Vec::new(); }
    std::fs::read_dir(&dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.path().is_file())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            std::fs::read(e.path()).ok().map(|b| (format!("assets/{name}"), b))
        })
        .collect()
}

// ── Shared types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct DeployResult {
    pub url: String,
    pub id: String,
    pub state: String,
}

#[derive(Debug, Serialize)]
pub struct DomainStatus {
    pub verified: bool,
    pub dns_records: Vec<DnsRecord>,
}

#[derive(Debug, Serialize)]
pub struct DnsRecord {
    pub record_type: String,
    pub name: String,
    pub value: String,
}

// ── Plausible Analytics ──────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct PlausibleConnection {
    pub token: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PlausibleStats {
    pub visitors: u64,
    pub pageviews: u64,
    pub bounce_rate: f64,
    pub visit_duration: f64,
    pub top_blocks: Vec<PlausibleTopBlock>,
}

#[derive(Debug, Serialize)]
pub struct PlausibleTopBlock {
    pub block_id: String,
    pub visitors: u64,
}

fn plausible_base(conn: &PlausibleConnection) -> String {
    conn.base_url
        .as_deref()
        .map(|s| s.trim_end_matches('/'))
        .filter(|s| !s.is_empty())
        .unwrap_or("https://plausible.io")
        .to_string()
}

pub async fn verify_plausible(conn: &PlausibleConnection) -> Result<(), String> {
    let base = plausible_base(conn);
    let resp = reqwest::Client::new()
        .get(format!("{base}/api/v1/sites"))
        .bearer_auth(&conn.token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 Plausible 토큰입니다.".to_string());
    }
    Ok(())
}

pub async fn fetch_plausible_stats(
    conn: &PlausibleConnection,
    site_id: &str,
    period: &str,
) -> Result<PlausibleStats, String> {
    let base = plausible_base(conn);
    let client = reqwest::Client::new();

    let agg_url = format!(
        "{base}/api/v1/stats/aggregate?site_id={site_id}&period={period}&metrics=visitors,pageviews,bounce_rate,visit_duration"
    );
    let agg_resp = client
        .get(&agg_url)
        .bearer_auth(&conn.token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let agg_status = agg_resp.status();
    let agg_text = agg_resp.text().await.unwrap_or_default();
    if !agg_status.is_success() {
        return Err(format!("Plausible 오류 ({agg_status}): {agg_text}"));
    }
    let agg_val: serde_json::Value = serde_json::from_str(&agg_text).unwrap_or_default();
    let r = &agg_val["results"];
    let visitors = r["visitors"]["value"].as_u64().unwrap_or(0);
    let pageviews = r["pageviews"]["value"].as_u64().unwrap_or(0);
    let bounce_rate = r["bounce_rate"]["value"].as_f64().unwrap_or(0.0);
    let visit_duration = r["visit_duration"]["value"].as_f64().unwrap_or(0.0);

    let bd_url = format!(
        "{base}/api/v1/stats/breakdown?site_id={site_id}&period={period}&property=event:props:block_id&metrics=visitors&filters=event:name%3D%3DBlockClick&limit=20"
    );
    let bd_resp = client
        .get(&bd_url)
        .bearer_auth(&conn.token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let bd_text = bd_resp.text().await.unwrap_or_default();
    let bd_val: serde_json::Value = serde_json::from_str(&bd_text).unwrap_or_default();
    let top_blocks: Vec<PlausibleTopBlock> = bd_val["results"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|item| PlausibleTopBlock {
                    block_id: item["block_id"].as_str().unwrap_or("").to_string(),
                    visitors: item["visitors"].as_u64().unwrap_or(0),
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(PlausibleStats {
        visitors,
        pageviews,
        bounce_rate,
        visit_duration,
        top_blocks,
    })
}

// ── Vercel ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct VercelFile {
    file: String,
    data: String,
    encoding: String,
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

pub async fn verify_vercel(token: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get("https://api.vercel.com/v2/user")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 Vercel 토큰입니다.".to_string());
    }
    Ok(())
}

pub async fn deploy_vercel(
    config: &Config,
    token: &str,
    project_name: &str,
    project_path: &str,
) -> Result<DeployResult, String> {
    let output = build(config).map_err(|e| format!("빌드 오류: {e}"))?;
    let mut files = vec![
        VercelFile { file: "index.html".to_string(), data: output.index_html, encoding: "utf-8".to_string() },
        VercelFile { file: "favicon.svg".to_string(), data: output.favicon_svg, encoding: "utf-8".to_string() },
    ];
    for (rel_path, bytes) in load_project_assets(project_path) {
        files.push(VercelFile {
            file: rel_path,
            data: base64::engine::general_purpose::STANDARD.encode(&bytes),
            encoding: "base64".to_string(),
        });
    }
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
        let msg = err["error"]["message"].as_str().unwrap_or(&text).to_string();
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

pub async fn check_vercel_deploy(token: &str, deploy_id: &str) -> Result<String, String> {
    let resp = reqwest::Client::new()
        .get(format!("https://api.vercel.com/v13/deployments/{deploy_id}"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    Ok(val["readyState"].as_str().unwrap_or("UNKNOWN").to_string())
}

pub async fn add_vercel_domain(
    token: &str,
    project_name: &str,
    domain: &str,
) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .post(format!("https://api.vercel.com/v9/projects/{project_name}/domains"))
        .bearer_auth(token)
        .json(&serde_json::json!({ "name": domain }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        let err: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let msg = err["error"]["message"].as_str().unwrap_or(&text).to_string();
        return Err(format!("도메인 추가 오류: {msg}"));
    }
    Ok(())
}

pub async fn check_vercel_domain(
    token: &str,
    project_name: &str,
    domain: &str,
) -> Result<DomainStatus, String> {
    let resp = reqwest::Client::new()
        .get(format!(
            "https://api.vercel.com/v9/projects/{project_name}/domains/{domain}"
        ))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let text = resp.text().await.unwrap_or_default();
    let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    let verified = val["verified"].as_bool().unwrap_or(false);
    let is_apex = !domain.contains('.') || domain.split('.').count() == 2;
    let dns_records = if is_apex {
        vec![
            DnsRecord {
                record_type: "A".to_string(),
                name: "@".to_string(),
                value: "76.76.21.21".to_string(),
            },
            DnsRecord {
                record_type: "CNAME".to_string(),
                name: "www".to_string(),
                value: "cname.vercel-dns.com".to_string(),
            },
        ]
    } else {
        vec![DnsRecord {
            record_type: "CNAME".to_string(),
            name: domain.split('.').next().unwrap_or("www").to_string(),
            value: "cname.vercel-dns.com".to_string(),
        }]
    };
    Ok(DomainStatus { verified, dns_records })
}

// ── Cloudflare Pages ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct CfConnection {
    pub token: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
}

fn sha256_hex(data: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(data);
    format!("{:x}", h.finalize())
}

fn ext_to_mime(path: &str) -> &'static str {
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}

pub async fn verify_cloudflare(token: &str, account_id: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects"
        ))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 Cloudflare 토큰 또는 Account ID입니다.".to_string());
    }
    Ok(())
}

pub async fn deploy_cloudflare(
    config: &Config,
    conn: &CfConnection,
    project_name: &str,
    project_path: &str,
) -> Result<DeployResult, String> {
    let output = build(config).map_err(|e| format!("빌드 오류: {e}"))?;
    let client = reqwest::Client::new();
    let token = &conn.token;
    let account_id = &conn.account_id;

    ensure_cf_project(&client, token, account_id, project_name).await?;

    let html_bytes = output.index_html.into_bytes();
    let svg_bytes = output.favicon_svg.into_bytes();
    let html_hash = sha256_hex(&html_bytes);
    let svg_hash = sha256_hex(&svg_bytes);

    let assets = load_project_assets(project_path);
    let mut manifest = serde_json::json!({
        "index.html": html_hash,
        "favicon.svg": svg_hash,
    });
    let mut parts: Vec<(String, Vec<u8>, &'static str)> = vec![
        (html_hash, html_bytes, "text/html"),
        (svg_hash, svg_bytes, "image/svg+xml"),
    ];
    for (rel_path, bytes) in &assets {
        let hash = sha256_hex(bytes);
        manifest[rel_path.as_str()] = serde_json::Value::String(hash.clone());
        parts.push((hash, bytes.clone(), ext_to_mime(rel_path)));
    }
    let mut form = reqwest::multipart::Form::new()
        .text("manifest", serde_json::to_string(&manifest).unwrap());
    for (hash, bytes, mime) in parts {
        form = form.part(hash, reqwest::multipart::Part::bytes(bytes).mime_str(mime).unwrap());
    }

    let resp = client
        .post(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments"
        ))
        .bearer_auth(token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    if !status.is_success() {
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let msg = val["errors"]
            .as_array()
            .and_then(|a| a.first())
            .and_then(|e| e["message"].as_str())
            .unwrap_or(&text)
            .to_string();
        return Err(format!("Cloudflare 오류 ({status}): {msg}"));
    }

    let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    let result = &val["result"];
    let id = result["id"].as_str().unwrap_or("").to_string();
    let url = result["url"]
        .as_str()
        .map(|u| if u.starts_with("http") { u.to_string() } else { format!("https://{u}") })
        .unwrap_or_else(|| format!("https://{project_name}.pages.dev"));
    let state = result["latest_stage"]["name"]
        .as_str()
        .unwrap_or("queued")
        .to_uppercase();

    Ok(DeployResult { url, id, state })
}

async fn ensure_cf_project(
    client: &reqwest::Client,
    token: &str,
    account_id: &str,
    project_name: &str,
) -> Result<(), String> {
    let check = client
        .get(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}"
        ))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if check.status().is_success() {
        return Ok(());
    }
    let resp = client
        .post(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects"
        ))
        .bearer_auth(token)
        .json(&serde_json::json!({ "name": project_name, "production_branch": "main" }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("CF 프로젝트 생성 오류: {text}"));
    }
    Ok(())
}

pub async fn add_cloudflare_domain(
    token: &str,
    account_id: &str,
    project_name: &str,
    domain: &str,
) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .post(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/domains"
        ))
        .bearer_auth(token)
        .json(&serde_json::json!({ "name": domain }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("도메인 추가 오류: {text}"));
    }
    Ok(())
}

pub async fn check_cloudflare_domain(
    token: &str,
    account_id: &str,
    project_name: &str,
    domain: &str,
) -> Result<DomainStatus, String> {
    let resp = reqwest::Client::new()
        .get(format!(
            "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}/domains/{domain}"
        ))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let text = resp.text().await.unwrap_or_default();
    let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
    let verified = val["result"]["status"].as_str() == Some("active");
    let dns_records = vec![DnsRecord {
        record_type: "CNAME".to_string(),
        name: "@".to_string(),
        value: format!("{project_name}.pages.dev"),
    }];
    Ok(DomainStatus { verified, dns_records })
}

// ── GitHub Pages ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct GhConnection {
    pub token: String,
    pub repo: String,
}

pub async fn verify_github(token: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get("https://api.github.com/user")
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 GitHub 토큰입니다.".to_string());
    }
    Ok(())
}

pub async fn deploy_github_pages(
    config: &Config,
    conn: &GhConnection,
    project_path: &str,
) -> Result<DeployResult, String> {
    let output = build(config).map_err(|e| format!("빌드 오류: {e}"))?;
    let client = reqwest::Client::new();
    let token = &conn.token;
    let repo = &conn.repo;

    ensure_gh_repo(&client, token, repo).await?;
    put_gh_file(&client, token, repo, "index.html", output.index_html.as_bytes()).await?;
    put_gh_file(&client, token, repo, "favicon.svg", output.favicon_svg.as_bytes()).await?;
    for (rel_path, bytes) in load_project_assets(project_path) {
        put_gh_file(&client, token, repo, &rel_path, &bytes).await?;
    }
    enable_gh_pages(&client, token, repo).await?;

    let owner = repo.split('/').next().unwrap_or("");
    let repo_name = repo.split('/').nth(1).unwrap_or("");
    Ok(DeployResult {
        url: format!("https://{owner}.github.io/{repo_name}"),
        id: "gh-pages".to_string(),
        state: "READY".to_string(),
    })
}

async fn ensure_gh_repo(
    client: &reqwest::Client,
    token: &str,
    repo: &str,
) -> Result<(), String> {
    let check = client
        .get(format!("https://api.github.com/repos/{repo}"))
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if check.status().is_success() {
        return Ok(());
    }
    let name = repo.split('/').nth(1).unwrap_or(repo);
    let resp = client
        .post("https://api.github.com/user/repos")
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .json(&serde_json::json!({
            "name": name,
            "private": false,
            "auto_init": true,
            "description": "opentree site"
        }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub 저장소 생성 오류: {text}"));
    }
    Ok(())
}

async fn put_gh_file(
    client: &reqwest::Client,
    token: &str,
    repo: &str,
    path: &str,
    content: &[u8],
) -> Result<(), String> {
    let encoded = base64::engine::general_purpose::STANDARD.encode(content);
    let get_url = format!("https://api.github.com/repos/{repo}/contents/{path}");
    let get_resp = client
        .get(&get_url)
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let mut body = serde_json::json!({
        "message": "deploy: update site",
        "content": encoded,
    });
    if get_resp.status().is_success() {
        let text = get_resp.text().await.unwrap_or_default();
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        if let Some(sha) = val["sha"].as_str() {
            body["sha"] = serde_json::Value::String(sha.to_string());
        }
    }

    let put_resp = client
        .put(&get_url)
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !put_resp.status().is_success() {
        let text = put_resp.text().await.unwrap_or_default();
        return Err(format!("파일 업로드 오류 ({path}): {text}"));
    }
    Ok(())
}

async fn enable_gh_pages(
    client: &reqwest::Client,
    token: &str,
    repo: &str,
) -> Result<(), String> {
    let url = format!("https://api.github.com/repos/{repo}/pages");
    let check = client
        .get(&url)
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if check.status().is_success() {
        return Ok(());
    }
    let resp = client
        .post(&url)
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .json(&serde_json::json!({ "source": { "branch": "main", "path": "/" } }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let status = resp.status();
    if !status.is_success() && status.as_u16() != 409 {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub Pages 활성화 오류: {text}"));
    }
    Ok(())
}

pub async fn add_github_domain(
    token: &str,
    repo: &str,
    domain: &str,
) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .put(format!("https://api.github.com/repos/{repo}/pages"))
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .json(&serde_json::json!({ "cname": domain, "source": { "branch": "main", "path": "/" } }))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("도메인 추가 오류: {text}"));
    }
    Ok(())
}

pub async fn check_github_domain(
    token: &str,
    repo: &str,
    domain: &str,
) -> Result<DomainStatus, String> {
    let resp = reqwest::Client::new()
        .get(format!("https://api.github.com/repos/{repo}/pages"))
        .bearer_auth(token)
        .header("User-Agent", "opentree/0.1")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let verified = if resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        val["cname"].as_str() == Some(domain) && val["status"].as_str() == Some("built")
    } else {
        false
    };
    let owner = repo.split('/').next().unwrap_or("");
    let is_apex = domain.split('.').count() <= 2;
    let dns_records = if is_apex {
        vec![
            DnsRecord { record_type: "A".to_string(), name: "@".to_string(), value: "185.199.108.153".to_string() },
            DnsRecord { record_type: "A".to_string(), name: "@".to_string(), value: "185.199.109.153".to_string() },
            DnsRecord { record_type: "A".to_string(), name: "@".to_string(), value: "185.199.110.153".to_string() },
            DnsRecord { record_type: "A".to_string(), name: "@".to_string(), value: "185.199.111.153".to_string() },
        ]
    } else {
        vec![DnsRecord {
            record_type: "CNAME".to_string(),
            name: "www".to_string(),
            value: format!("{owner}.github.io"),
        }]
    };
    Ok(DomainStatus { verified, dns_records })
}
