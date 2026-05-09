use base64::Engine;
use keyring::Entry;
use opentree_core::{build::build_with_time, config::Config};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

fn now_iso() -> String {
    OffsetDateTime::now_utc().format(&Rfc3339).unwrap_or_default()
}

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

// ── Unsplash ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct UnsplashPhoto {
    pub id: String,
    pub thumb_url: String,
    pub regular_url: String,
    pub full_url: String,
    pub photographer: String,
    pub photographer_url: String,
    pub photo_url: String,
    pub alt: String,
}

pub async fn verify_unsplash(token: &str) -> Result<(), String> {
    verify_unsplash_at(token, "https://api.unsplash.com").await
}

async fn verify_unsplash_at(token: &str, base: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{base}/me"))
        .header("Authorization", format!("Client-ID {token}"))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if resp.status().is_success() { return Ok(()); }
    let resp2 = client
        .get(format!("{base}/photos/random"))
        .header("Authorization", format!("Client-ID {token}"))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp2.status().is_success() {
        return Err("유효하지 않은 Unsplash Access Key입니다.".to_string());
    }
    Ok(())
}

pub async fn unsplash_search(token: &str, query: &str, page: u32) -> Result<Vec<UnsplashPhoto>, String> {
    unsplash_search_at(token, query, page, "https://api.unsplash.com").await
}

async fn unsplash_search_at(token: &str, query: &str, page: u32, base: &str) -> Result<Vec<UnsplashPhoto>, String> {
    let q = urlencoding::encode(query);
    let url = format!("{base}/search/photos?query={q}&page={page}&per_page=20&orientation=portrait");
    let resp = reqwest::Client::new()
        .get(&url)
        .header("Authorization", format!("Client-ID {token}"))
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기: {e}"))?;
    if !status.is_success() {
        return Err(format!("Unsplash 오류 ({status}): {text}"));
    }
    Ok(parse_unsplash_search(&text))
}

pub(crate) fn parse_unsplash_search(text: &str) -> Vec<UnsplashPhoto> {
    let val: serde_json::Value = serde_json::from_str(text).unwrap_or_default();
    val["results"].as_array().map(|arr| {
        arr.iter().map(|p| UnsplashPhoto {
            id: p["id"].as_str().unwrap_or("").to_string(),
            thumb_url: p["urls"]["thumb"].as_str().unwrap_or("").to_string(),
            regular_url: p["urls"]["regular"].as_str().unwrap_or("").to_string(),
            full_url: p["urls"]["full"].as_str().unwrap_or("").to_string(),
            photographer: p["user"]["name"].as_str().unwrap_or("").to_string(),
            photographer_url: format!("{}?utm_source=opentree&utm_medium=referral", p["user"]["links"]["html"].as_str().unwrap_or("")),
            photo_url: format!("{}?utm_source=opentree&utm_medium=referral", p["links"]["html"].as_str().unwrap_or("")),
            alt: p["alt_description"].as_str().unwrap_or("").to_string(),
        }).collect::<Vec<_>>()
    }).unwrap_or_default()
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

pub(crate) fn parse_plausible_aggregate(text: &str) -> (u64, u64, f64, f64) {
    let val: serde_json::Value = serde_json::from_str(text).unwrap_or_default();
    let r = &val["results"];
    (
        r["visitors"]["value"].as_u64().unwrap_or(0),
        r["pageviews"]["value"].as_u64().unwrap_or(0),
        r["bounce_rate"]["value"].as_f64().unwrap_or(0.0),
        r["visit_duration"]["value"].as_f64().unwrap_or(0.0),
    )
}

pub(crate) fn parse_plausible_breakdown(text: &str) -> Vec<PlausibleTopBlock> {
    let val: serde_json::Value = serde_json::from_str(text).unwrap_or_default();
    val["results"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|item| PlausibleTopBlock {
                    block_id: item["block_id"].as_str().unwrap_or("").to_string(),
                    visitors: item["visitors"].as_u64().unwrap_or(0),
                })
                .collect()
        })
        .unwrap_or_default()
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
    let (visitors, pageviews, bounce_rate, visit_duration) = parse_plausible_aggregate(&agg_text);

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
    let top_blocks = parse_plausible_breakdown(&bd_text);

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
    verify_vercel_at(token, "https://api.vercel.com").await
}

async fn verify_vercel_at(token: &str, base: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get(format!("{base}/v2/user"))
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
    let output = build_with_time(config, Some(&now_iso())).map_err(|e| format!("빌드 오류: {e}"))?;
    let mut files = vec![
        VercelFile { file: "index.html".to_string(), data: output.index_html, encoding: "utf-8".to_string() },
        VercelFile { file: "favicon.svg".to_string(), data: output.favicon_svg, encoding: "utf-8".to_string() },
        VercelFile { file: "robots.txt".to_string(), data: output.robots_txt, encoding: "utf-8".to_string() },
    ];
    if !output.sitemap_xml.is_empty() {
        files.push(VercelFile {
            file: "sitemap.xml".to_string(),
            data: output.sitemap_xml,
            encoding: "utf-8".to_string(),
        });
    }
    for (locale_path, html) in output.locale_pages {
        files.push(VercelFile {
            file: format!("{locale_path}/index.html"),
            data: html,
            encoding: "utf-8".to_string(),
        });
    }
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
    verify_cloudflare_at(token, account_id, "https://api.cloudflare.com").await
}

async fn verify_cloudflare_at(token: &str, account_id: &str, base: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get(format!(
            "{base}/client/v4/accounts/{account_id}/pages/projects"
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
    let output = build_with_time(config, Some(&now_iso())).map_err(|e| format!("빌드 오류: {e}"))?;
    let client = reqwest::Client::new();
    let token = &conn.token;
    let account_id = &conn.account_id;

    ensure_cf_project(&client, token, account_id, project_name).await?;

    let html_bytes = output.index_html.into_bytes();
    let svg_bytes = output.favicon_svg.into_bytes();
    let robots_bytes = output.robots_txt.into_bytes();
    let html_hash = sha256_hex(&html_bytes);
    let svg_hash = sha256_hex(&svg_bytes);
    let robots_hash = sha256_hex(&robots_bytes);

    let assets = load_project_assets(project_path);
    let mut manifest = serde_json::json!({
        "index.html": html_hash,
        "favicon.svg": svg_hash,
        "robots.txt": robots_hash,
    });
    let mut parts: Vec<(String, Vec<u8>, &'static str)> = vec![
        (html_hash, html_bytes, "text/html"),
        (svg_hash, svg_bytes, "image/svg+xml"),
        (robots_hash, robots_bytes, "text/plain"),
    ];
    if !output.sitemap_xml.is_empty() {
        let sitemap_bytes = output.sitemap_xml.into_bytes();
        let sitemap_hash = sha256_hex(&sitemap_bytes);
        manifest["sitemap.xml"] = serde_json::Value::String(sitemap_hash.clone());
        parts.push((sitemap_hash, sitemap_bytes, "application/xml"));
    }
    for (locale_path, html) in output.locale_pages {
        let bytes = html.into_bytes();
        let hash = sha256_hex(&bytes);
        let path = format!("{locale_path}/index.html");
        manifest[path.as_str()] = serde_json::Value::String(hash.clone());
        parts.push((hash, bytes, "text/html"));
    }
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
    verify_github_at(token, "https://api.github.com").await
}

async fn verify_github_at(token: &str, base: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get(format!("{base}/user"))
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
    let output = build_with_time(config, Some(&now_iso())).map_err(|e| format!("빌드 오류: {e}"))?;
    let client = reqwest::Client::new();
    let token = &conn.token;
    let repo = &conn.repo;

    ensure_gh_repo(&client, token, repo).await?;
    put_gh_file(&client, token, repo, "index.html", output.index_html.as_bytes()).await?;
    put_gh_file(&client, token, repo, "favicon.svg", output.favicon_svg.as_bytes()).await?;
    put_gh_file(&client, token, repo, "robots.txt", output.robots_txt.as_bytes()).await?;
    if !output.sitemap_xml.is_empty() {
        put_gh_file(&client, token, repo, "sitemap.xml", output.sitemap_xml.as_bytes()).await?;
    }
    for (locale_path, html) in &output.locale_pages {
        put_gh_file(&client, token, repo, &format!("{locale_path}/index.html"), html.as_bytes()).await?;
    }
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── Pure helpers ─────────────────────────────────────────────────────────

    #[test]
    fn sha256_hex_known_input() {
        let hash = sha256_hex(b"hello");
        assert_eq!(hash, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    }

    #[test]
    fn sha256_hex_empty_input() {
        let hash = sha256_hex(b"");
        assert_eq!(hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    #[test]
    fn ext_to_mime_table() {
        assert_eq!(ext_to_mime("a.jpg"), "image/jpeg");
        assert_eq!(ext_to_mime("a.JPEG"), "image/jpeg");
        assert_eq!(ext_to_mime("a.png"), "image/png");
        assert_eq!(ext_to_mime("a.gif"), "image/gif");
        assert_eq!(ext_to_mime("a.webp"), "image/webp");
        assert_eq!(ext_to_mime("a.svg"), "image/svg+xml");
        assert_eq!(ext_to_mime("a.unknown"), "application/octet-stream");
        assert_eq!(ext_to_mime("noext"), "application/octet-stream");
    }

    #[test]
    fn plausible_base_defaults_to_cloud() {
        let conn = PlausibleConnection { token: "x".into(), base_url: None };
        assert_eq!(plausible_base(&conn), "https://plausible.io");
    }

    #[test]
    fn plausible_base_uses_self_host_and_strips_trailing_slash() {
        let conn = PlausibleConnection { token: "x".into(), base_url: Some("https://stats.example.com/".into()) };
        assert_eq!(plausible_base(&conn), "https://stats.example.com");
    }

    #[test]
    fn plausible_base_falls_back_when_empty_string() {
        let conn = PlausibleConnection { token: "x".into(), base_url: Some("".into()) };
        assert_eq!(plausible_base(&conn), "https://plausible.io");
    }

    // ── Parsers ──────────────────────────────────────────────────────────────

    #[test]
    fn parse_plausible_aggregate_extracts_metrics() {
        let raw = r#"{"results":{"visitors":{"value":1234},"pageviews":{"value":5678},"bounce_rate":{"value":42.5},"visit_duration":{"value":120.7}}}"#;
        let (visitors, pageviews, bounce, dur) = parse_plausible_aggregate(raw);
        assert_eq!(visitors, 1234);
        assert_eq!(pageviews, 5678);
        assert!((bounce - 42.5).abs() < 0.01);
        assert!((dur - 120.7).abs() < 0.01);
    }

    #[test]
    fn parse_plausible_aggregate_missing_fields_default_to_zero() {
        let (v, p, b, d) = parse_plausible_aggregate("{}");
        assert_eq!(v, 0);
        assert_eq!(p, 0);
        assert_eq!(b, 0.0);
        assert_eq!(d, 0.0);
    }

    #[test]
    fn parse_plausible_breakdown_maps_results() {
        let raw = r#"{"results":[
            {"block_id":"abc","visitors":50},
            {"block_id":"def","visitors":12}
        ]}"#;
        let blocks = parse_plausible_breakdown(raw);
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].block_id, "abc");
        assert_eq!(blocks[0].visitors, 50);
        assert_eq!(blocks[1].block_id, "def");
    }

    #[test]
    fn parse_plausible_breakdown_empty_results() {
        let blocks = parse_plausible_breakdown(r#"{"results":[]}"#);
        assert!(blocks.is_empty());
    }

    #[test]
    fn parse_unsplash_search_attaches_utm_params() {
        let raw = r#"{"results":[{
            "id": "photo1",
            "alt_description": "Mountain",
            "urls": {"thumb":"https://thumb.example/x.jpg","regular":"https://reg.example/x.jpg","full":"https://full.example/x.jpg"},
            "user": {"name": "Jane", "links": {"html": "https://unsplash.com/@jane"}},
            "links": {"html": "https://unsplash.com/photos/abc"}
        }]}"#;
        let photos = parse_unsplash_search(raw);
        assert_eq!(photos.len(), 1);
        let p = &photos[0];
        assert_eq!(p.id, "photo1");
        assert_eq!(p.alt, "Mountain");
        assert_eq!(p.thumb_url, "https://thumb.example/x.jpg");
        assert_eq!(p.photographer, "Jane");
        assert!(p.photographer_url.contains("utm_source=opentree"));
        assert!(p.photographer_url.contains("utm_medium=referral"));
        assert!(p.photo_url.contains("https://unsplash.com/photos/abc"));
    }

    #[test]
    fn parse_unsplash_search_handles_missing_fields() {
        let photos = parse_unsplash_search(r#"{"results":[{}]}"#);
        assert_eq!(photos.len(), 1);
        assert_eq!(photos[0].id, "");
        assert_eq!(photos[0].photographer, "");
    }

    #[test]
    fn parse_unsplash_search_no_results_array() {
        let photos = parse_unsplash_search("{}");
        assert!(photos.is_empty());
    }

    // ── HTTP via mockito ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn verify_vercel_at_ok_on_200() {
        let mut server = mockito::Server::new_async().await;
        let m = server.mock("GET", "/v2/user")
            .match_header("authorization", "Bearer TOKEN")
            .with_status(200)
            .with_body("{}")
            .create_async().await;
        assert!(verify_vercel_at("TOKEN", &server.url()).await.is_ok());
        m.assert_async().await;
    }

    #[tokio::test]
    async fn verify_vercel_at_err_on_401() {
        let mut server = mockito::Server::new_async().await;
        let _m = server.mock("GET", "/v2/user").with_status(401).create_async().await;
        let res = verify_vercel_at("BAD", &server.url()).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Vercel"));
    }

    #[tokio::test]
    async fn verify_github_at_ok_with_user_agent() {
        let mut server = mockito::Server::new_async().await;
        let m = server.mock("GET", "/user")
            .match_header("user-agent", "opentree/0.1")
            .match_header("accept", "application/vnd.github+json")
            .with_status(200)
            .with_body("{}")
            .create_async().await;
        assert!(verify_github_at("ghp_xx", &server.url()).await.is_ok());
        m.assert_async().await;
    }

    #[tokio::test]
    async fn verify_github_at_err_on_401() {
        let mut server = mockito::Server::new_async().await;
        let _m = server.mock("GET", "/user").with_status(401).create_async().await;
        assert!(verify_github_at("bad", &server.url()).await.is_err());
    }

    #[tokio::test]
    async fn verify_cloudflare_at_includes_account_id_in_path() {
        let mut server = mockito::Server::new_async().await;
        let m = server.mock("GET", "/client/v4/accounts/acc-123/pages/projects")
            .match_header("authorization", "Bearer CF")
            .with_status(200)
            .with_body("{}")
            .create_async().await;
        assert!(verify_cloudflare_at("CF", "acc-123", &server.url()).await.is_ok());
        m.assert_async().await;
    }

    #[tokio::test]
    async fn verify_cloudflare_at_err_on_403() {
        let mut server = mockito::Server::new_async().await;
        let _m = server.mock("GET", "/client/v4/accounts/x/pages/projects").with_status(403).create_async().await;
        assert!(verify_cloudflare_at("bad", "x", &server.url()).await.is_err());
    }

    #[tokio::test]
    async fn verify_unsplash_at_ok_when_me_succeeds() {
        let mut server = mockito::Server::new_async().await;
        let m = server.mock("GET", "/me")
            .match_header("authorization", "Client-ID KEY")
            .with_status(200).with_body("{}")
            .create_async().await;
        assert!(verify_unsplash_at("KEY", &server.url()).await.is_ok());
        m.assert_async().await;
    }

    #[tokio::test]
    async fn verify_unsplash_at_falls_back_to_random_when_me_403() {
        let mut server = mockito::Server::new_async().await;
        let _me = server.mock("GET", "/me").with_status(403).create_async().await;
        let random = server.mock("GET", "/photos/random").with_status(200).with_body("{}").create_async().await;
        assert!(verify_unsplash_at("KEY", &server.url()).await.is_ok());
        random.assert_async().await;
    }

    #[tokio::test]
    async fn verify_unsplash_at_err_when_both_fail() {
        let mut server = mockito::Server::new_async().await;
        let _me = server.mock("GET", "/me").with_status(401).create_async().await;
        let _r = server.mock("GET", "/photos/random").with_status(401).create_async().await;
        assert!(verify_unsplash_at("BAD", &server.url()).await.is_err());
    }

    #[tokio::test]
    async fn unsplash_search_at_returns_parsed_photos() {
        let mut server = mockito::Server::new_async().await;
        let body = r#"{"results":[{
            "id":"x","alt_description":"A",
            "urls":{"thumb":"t","regular":"r","full":"f"},
            "user":{"name":"U","links":{"html":"https://unsplash.com/@u"}},
            "links":{"html":"https://unsplash.com/photos/x"}
        }]}"#;
        let m = server.mock("GET", mockito::Matcher::Regex(r"^/search/photos\?".into()))
            .match_header("authorization", "Client-ID K")
            .with_status(200).with_body(body)
            .create_async().await;
        let photos = unsplash_search_at("K", "mountain", 1, &server.url()).await.expect("ok");
        assert_eq!(photos.len(), 1);
        assert_eq!(photos[0].id, "x");
        m.assert_async().await;
    }

    #[tokio::test]
    async fn unsplash_search_at_propagates_error_status() {
        let mut server = mockito::Server::new_async().await;
        let _m = server.mock("GET", mockito::Matcher::Regex(r"^/search/photos".into()))
            .with_status(403).with_body("forbidden")
            .create_async().await;
        let res = unsplash_search_at("K", "q", 1, &server.url()).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Unsplash"));
    }

    #[tokio::test]
    async fn fetch_plausible_stats_combines_aggregate_and_breakdown() {
        let mut server = mockito::Server::new_async().await;
        let _agg = server.mock("GET", mockito::Matcher::Regex(r"^/api/v1/stats/aggregate".into()))
            .match_header("authorization", "Bearer P")
            .with_status(200)
            .with_body(r#"{"results":{"visitors":{"value":100},"pageviews":{"value":250},"bounce_rate":{"value":40.0},"visit_duration":{"value":90.0}}}"#)
            .create_async().await;
        let _bd = server.mock("GET", mockito::Matcher::Regex(r"^/api/v1/stats/breakdown".into()))
            .with_status(200)
            .with_body(r#"{"results":[{"block_id":"a","visitors":12},{"block_id":"b","visitors":3}]}"#)
            .create_async().await;
        let conn = PlausibleConnection { token: "P".into(), base_url: Some(server.url()) };
        let stats = fetch_plausible_stats(&conn, "example.com", "7d").await.expect("ok");
        assert_eq!(stats.visitors, 100);
        assert_eq!(stats.pageviews, 250);
        assert_eq!(stats.top_blocks.len(), 2);
        assert_eq!(stats.top_blocks[0].block_id, "a");
    }

    #[tokio::test]
    async fn fetch_plausible_stats_errors_when_aggregate_fails() {
        let mut server = mockito::Server::new_async().await;
        let _agg = server.mock("GET", mockito::Matcher::Regex(r"^/api/v1/stats/aggregate".into()))
            .with_status(500).with_body("server error").create_async().await;
        let conn = PlausibleConnection { token: "P".into(), base_url: Some(server.url()) };
        let res = fetch_plausible_stats(&conn, "example.com", "7d").await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn verify_plausible_calls_sites_endpoint() {
        let mut server = mockito::Server::new_async().await;
        let m = server.mock("GET", "/api/v1/sites")
            .match_header("authorization", "Bearer P")
            .with_status(200).with_body("[]")
            .create_async().await;
        let conn = PlausibleConnection { token: "P".into(), base_url: Some(server.url()) };
        assert!(verify_plausible(&conn).await.is_ok());
        m.assert_async().await;
    }

    #[tokio::test]
    async fn verify_plausible_errors_on_non_2xx() {
        let mut server = mockito::Server::new_async().await;
        let _m = server.mock("GET", "/api/v1/sites").with_status(401).create_async().await;
        let conn = PlausibleConnection { token: "x".into(), base_url: Some(server.url()) };
        assert!(verify_plausible(&conn).await.is_err());
    }
}
