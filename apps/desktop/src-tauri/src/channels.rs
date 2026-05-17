use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use time::OffsetDateTime;

const SERVICE: &str = "dev.kidow.opentree";
const STORE_FILE: &str = "channels.json";
const MAX_VIDEOS: u32 = 12;

// ── Store types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelAccount {
    pub id: String,
    pub platform: String,
    pub handle: String,
    pub title: String,
    pub thumbnail_url: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSnapshot {
    pub account_id: String,
    pub date: String,
    pub subscribers: u64,
    pub total_views: u64,
    pub video_count: u64,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelVideo {
    pub id: String,
    pub title: String,
    pub thumbnail_url: String,
    pub published_at: String,
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelStore {
    #[serde(default)]
    pub accounts: Vec<ChannelAccount>,
    #[serde(default)]
    pub snapshots: Vec<ChannelSnapshot>,
    #[serde(default)]
    pub videos: std::collections::HashMap<String, Vec<ChannelVideo>>,
}

// ── Persistence ──────────────────────────────────────────────────────────────

fn store_path(data_dir: &PathBuf) -> PathBuf {
    data_dir.join(STORE_FILE)
}

pub fn load_store(data_dir: &PathBuf) -> ChannelStore {
    let path = store_path(data_dir);
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_store(data_dir: &PathBuf, store: &ChannelStore) -> Result<(), String> {
    std::fs::create_dir_all(data_dir).map_err(|e| format!("디렉터리 생성 오류: {e}"))?;
    let json = serde_json::to_string_pretty(store).map_err(|e| format!("직렬화 오류: {e}"))?;
    std::fs::write(store_path(data_dir), json).map_err(|e| format!("저장 오류: {e}"))
}

fn key_entry(account_id: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, &format!("channel.{account_id}")).map_err(|e| e.to_string())
}

fn save_api_key(account_id: &str, api_key: &str) -> Result<(), String> {
    key_entry(account_id)?
        .set_password(api_key)
        .map_err(|e| e.to_string())
}

fn load_api_key(account_id: &str) -> Result<String, String> {
    key_entry(account_id)?
        .get_password()
        .map_err(|_| "API 키를 찾을 수 없습니다. 채널을 다시 연결하세요.".to_string())
}

fn delete_api_key(account_id: &str) -> Result<(), String> {
    match key_entry(account_id)?.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn today() -> String {
    let d = OffsetDateTime::now_utc().date();
    format!("{:04}-{:02}-{:02}", d.year(), d.month() as u8, d.day())
}

fn now_iso() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default()
}

// ── YouTube channel URL parsing ──────────────────────────────────────────────

enum ChannelRef {
    Id(String),
    Handle(String),
}

fn parse_youtube_ref(input: &str) -> Result<ChannelRef, String> {
    let s = input.trim();
    if s.is_empty() {
        return Err("채널 URL 또는 핸들을 입력하세요.".to_string());
    }
    // Bare channel id
    if s.starts_with("UC") && !s.contains('/') && !s.contains('.') {
        return Ok(ChannelRef::Id(s.to_string()));
    }
    // Bare handle
    if let Some(rest) = s.strip_prefix('@') {
        if !rest.contains('/') {
            return Ok(ChannelRef::Handle(rest.to_string()));
        }
    }
    let path = s
        .split_once("youtube.com/")
        .map(|(_, p)| p)
        .or_else(|| s.split_once("youtu.be/").map(|(_, p)| p))
        .unwrap_or(s);
    let path = path.split(['?', '#']).next().unwrap_or(path).trim_end_matches('/');
    if let Some(id) = path.strip_prefix("channel/") {
        return Ok(ChannelRef::Id(id.to_string()));
    }
    if let Some(handle) = path.strip_prefix('@') {
        return Ok(ChannelRef::Handle(handle.to_string()));
    }
    if let Some(name) = path.strip_prefix("c/").or_else(|| path.strip_prefix("user/")) {
        return Ok(ChannelRef::Handle(name.to_string()));
    }
    Err("YouTube 채널 URL을 인식할 수 없습니다. 예: https://www.youtube.com/@핸들".to_string())
}

// ── YouTube API ──────────────────────────────────────────────────────────────

const YT_API: &str = "https://www.googleapis.com/youtube/v3";

#[derive(Deserialize)]
#[serde(bound(deserialize = "T: Deserialize<'de>"))]
struct YtListResponse<T> {
    #[serde(default = "Vec::new")]
    items: Vec<T>,
}

#[derive(Deserialize)]
struct YtChannel {
    id: String,
    snippet: YtChannelSnippet,
    statistics: YtChannelStats,
    #[serde(rename = "contentDetails")]
    content_details: YtContentDetails,
}

#[derive(Deserialize)]
struct YtChannelSnippet {
    title: String,
    #[serde(rename = "customUrl", default)]
    custom_url: String,
    thumbnails: YtThumbnails,
}

#[derive(Deserialize)]
struct YtChannelStats {
    #[serde(rename = "subscriberCount", default)]
    subscriber_count: String,
    #[serde(rename = "viewCount", default)]
    view_count: String,
    #[serde(rename = "videoCount", default)]
    video_count: String,
}

#[derive(Deserialize)]
struct YtContentDetails {
    #[serde(rename = "relatedPlaylists")]
    related_playlists: YtRelatedPlaylists,
}

#[derive(Deserialize)]
struct YtRelatedPlaylists {
    #[serde(default)]
    uploads: String,
}

#[derive(Deserialize, Default)]
struct YtThumbnails {
    #[serde(default)]
    medium: Option<YtThumb>,
    #[serde(default)]
    high: Option<YtThumb>,
    #[serde(default)]
    default: Option<YtThumb>,
}

#[derive(Deserialize)]
struct YtThumb {
    url: String,
}

#[derive(Deserialize)]
struct YtPlaylistItem {
    snippet: YtPlaylistSnippet,
}

#[derive(Deserialize)]
struct YtPlaylistSnippet {
    title: String,
    #[serde(rename = "publishedAt", default)]
    published_at: String,
    thumbnails: YtThumbnails,
    #[serde(rename = "resourceId")]
    resource_id: YtResourceId,
}

#[derive(Deserialize)]
struct YtResourceId {
    #[serde(rename = "videoId", default)]
    video_id: String,
}

impl YtThumbnails {
    fn best(&self) -> String {
        self.high
            .as_ref()
            .or(self.medium.as_ref())
            .or(self.default.as_ref())
            .map(|t| t.url.clone())
            .unwrap_or_default()
    }
}

fn parse_count(s: &str) -> u64 {
    s.parse().unwrap_or(0)
}

async fn yt_fetch_channel(api_key: &str, chref: &ChannelRef) -> Result<YtChannel, String> {
    let param = match chref {
        ChannelRef::Id(id) => format!("id={}", urlencoding::encode(id)),
        ChannelRef::Handle(h) => format!("forHandle={}", urlencoding::encode(h)),
    };
    let url = format!(
        "{YT_API}/channels?part=snippet,statistics,contentDetails&{param}&key={}",
        urlencoding::encode(api_key)
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    if !status.is_success() {
        return Err(youtube_error(status.as_u16(), &text));
    }
    let parsed: YtListResponse<YtChannel> =
        serde_json::from_str(&text).map_err(|e| format!("응답 파싱 오류: {e}"))?;
    parsed
        .items
        .into_iter()
        .next()
        .ok_or_else(|| "해당 채널을 찾을 수 없습니다.".to_string())
}

async fn yt_fetch_videos(api_key: &str, uploads_playlist: &str) -> Result<Vec<ChannelVideo>, String> {
    if uploads_playlist.is_empty() {
        return Ok(Vec::new());
    }
    let url = format!(
        "{YT_API}/playlistItems?part=snippet&maxResults={MAX_VIDEOS}&playlistId={}&key={}",
        urlencoding::encode(uploads_playlist),
        urlencoding::encode(api_key)
    );
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    if !status.is_success() {
        return Err(youtube_error(status.as_u16(), &text));
    }
    let parsed: YtListResponse<YtPlaylistItem> =
        serde_json::from_str(&text).map_err(|e| format!("응답 파싱 오류: {e}"))?;
    Ok(parsed
        .items
        .into_iter()
        .filter_map(|item| {
            let vid = item.snippet.resource_id.video_id;
            if vid.is_empty() {
                return None;
            }
            Some(ChannelVideo {
                url: format!("https://www.youtube.com/watch?v={vid}"),
                id: vid,
                title: item.snippet.title,
                thumbnail_url: item.snippet.thumbnails.best(),
                published_at: item.snippet.published_at,
            })
        })
        .collect())
}

fn youtube_error(code: u16, body: &str) -> String {
    match code {
        400 => "잘못된 요청입니다. API 키 또는 채널 주소를 확인하세요.".to_string(),
        403 => "API 키가 거부되었습니다. Google Cloud Console에서 YouTube Data API v3가 활성화되어 있고 쿼터가 남아 있는지 확인하세요.".to_string(),
        404 => "채널을 찾을 수 없습니다.".to_string(),
        _ => format!("YouTube API 오류 ({code}): {}", body.chars().take(200).collect::<String>()),
    }
}

// ── Store mutations ──────────────────────────────────────────────────────────

fn upsert_snapshot(store: &mut ChannelStore, snap: ChannelSnapshot) {
    if let Some(existing) = store
        .snapshots
        .iter_mut()
        .find(|s| s.account_id == snap.account_id && s.date == snap.date)
    {
        *existing = snap;
    } else {
        store.snapshots.push(snap);
    }
}

/// Connect a YouTube channel: resolve via API key, persist account + first snapshot + videos.
pub async fn connect_youtube(
    data_dir: &PathBuf,
    api_key: &str,
    channel_url: &str,
) -> Result<ChannelStore, String> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err("YouTube API 키를 입력하세요.".to_string());
    }
    let chref = parse_youtube_ref(channel_url)?;
    let channel = yt_fetch_channel(api_key, &chref).await?;
    let account_id = format!("youtube:{}", channel.id);

    let mut store = load_store(data_dir);
    if store.accounts.iter().any(|a| a.id == account_id) {
        return Err("이미 연결된 채널입니다.".to_string());
    }

    let videos = yt_fetch_videos(api_key, &channel.content_details.related_playlists.uploads).await?;

    let handle = if channel.snippet.custom_url.is_empty() {
        channel.id.clone()
    } else {
        channel.snippet.custom_url.clone()
    };
    let account = ChannelAccount {
        id: account_id.clone(),
        platform: "youtube".to_string(),
        handle: handle.clone(),
        title: channel.snippet.title.clone(),
        thumbnail_url: channel.snippet.thumbnails.best(),
        url: format!("https://www.youtube.com/channel/{}", channel.id),
    };
    let snapshot = ChannelSnapshot {
        account_id: account_id.clone(),
        date: today(),
        subscribers: parse_count(&channel.statistics.subscriber_count),
        total_views: parse_count(&channel.statistics.view_count),
        video_count: parse_count(&channel.statistics.video_count),
        fetched_at: now_iso(),
    };

    save_api_key(&account_id, api_key)?;
    store.accounts.push(account);
    upsert_snapshot(&mut store, snapshot);
    store.videos.insert(account_id, videos);
    save_store(data_dir, &store)?;
    Ok(store)
}

/// Refresh an existing account: re-fetch metrics + videos using the stored API key.
pub async fn refresh_channel(data_dir: &PathBuf, account_id: &str) -> Result<ChannelStore, String> {
    let mut store = load_store(data_dir);
    let account = store
        .accounts
        .iter()
        .find(|a| a.id == account_id)
        .ok_or_else(|| "연결된 채널이 아닙니다.".to_string())?
        .clone();
    if account.platform != "youtube" {
        return Err("지원하지 않는 플랫폼입니다.".to_string());
    }
    let api_key = load_api_key(account_id)?;
    let chref = ChannelRef::Id(account_id.trim_start_matches("youtube:").to_string());
    let channel = yt_fetch_channel(&api_key, &chref).await?;
    let videos = yt_fetch_videos(&api_key, &channel.content_details.related_playlists.uploads).await?;

    let snapshot = ChannelSnapshot {
        account_id: account_id.to_string(),
        date: today(),
        subscribers: parse_count(&channel.statistics.subscriber_count),
        total_views: parse_count(&channel.statistics.view_count),
        video_count: parse_count(&channel.statistics.video_count),
        fetched_at: now_iso(),
    };
    if let Some(acc) = store.accounts.iter_mut().find(|a| a.id == account_id) {
        acc.title = channel.snippet.title;
        acc.thumbnail_url = channel.snippet.thumbnails.best();
    }
    upsert_snapshot(&mut store, snapshot);
    store.videos.insert(account_id.to_string(), videos);
    save_store(data_dir, &store)?;
    Ok(store)
}

/// Remove an account and all its stored data.
pub fn disconnect_channel(data_dir: &PathBuf, account_id: &str) -> Result<ChannelStore, String> {
    let mut store = load_store(data_dir);
    store.accounts.retain(|a| a.id != account_id);
    store.snapshots.retain(|s| s.account_id != account_id);
    store.videos.remove(account_id);
    delete_api_key(account_id)?;
    save_store(data_dir, &store)?;
    Ok(store)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_handle_url() {
        match parse_youtube_ref("https://www.youtube.com/@mkbhd").unwrap() {
            ChannelRef::Handle(h) => assert_eq!(h, "mkbhd"),
            _ => panic!("expected handle"),
        }
    }

    #[test]
    fn parses_channel_id_url() {
        match parse_youtube_ref("https://www.youtube.com/channel/UCabc123").unwrap() {
            ChannelRef::Id(id) => assert_eq!(id, "UCabc123"),
            _ => panic!("expected id"),
        }
    }

    #[test]
    fn parses_bare_handle() {
        match parse_youtube_ref("@someone").unwrap() {
            ChannelRef::Handle(h) => assert_eq!(h, "someone"),
            _ => panic!("expected handle"),
        }
    }

    #[test]
    fn rejects_empty() {
        assert!(parse_youtube_ref("  ").is_err());
    }

    #[test]
    fn upsert_replaces_same_day() {
        let mut store = ChannelStore::default();
        upsert_snapshot(&mut store, ChannelSnapshot {
            account_id: "a".into(), date: "2026-05-16".into(),
            subscribers: 1, total_views: 1, video_count: 1, fetched_at: "x".into(),
        });
        upsert_snapshot(&mut store, ChannelSnapshot {
            account_id: "a".into(), date: "2026-05-16".into(),
            subscribers: 2, total_views: 2, video_count: 2, fetched_at: "y".into(),
        });
        assert_eq!(store.snapshots.len(), 1);
        assert_eq!(store.snapshots[0].subscribers, 2);
    }
}
