use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub args: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct ChatResponse {
    pub text: String,
    pub tool_calls: Vec<ToolCall>,
}

const ANTHROPIC_MODEL: &str = "claude-sonnet-4-5-20250929";
const OPENAI_MODEL: &str = "gpt-4o-mini";

pub async fn verify_anthropic(token: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get("https://api.anthropic.com/v1/models")
        .header("x-api-key", token)
        .header("anthropic-version", "2023-06-01")
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 Anthropic API 키입니다.".to_string());
    }
    Ok(())
}

pub async fn verify_openai(token: &str) -> Result<(), String> {
    let resp = reqwest::Client::new()
        .get("https://api.openai.com/v1/models")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;
    if !resp.status().is_success() {
        return Err("유효하지 않은 OpenAI API 키입니다.".to_string());
    }
    Ok(())
}

fn system_prompt(config_json: &serde_json::Value) -> String {
    format!(
        "당신은 opentree (link-in-bio 사이트 빌더)의 AI 편집 어시스턴트입니다. 사용자의 자연어 요청을 분석해서 제공된 도구만 사용해 페이지를 편집하세요.\n\n\
         규칙:\n\
         - 항상 도구 호출로 응답하세요. 단순히 설명만 하지 말고 실제로 변경을 적용하세요.\n\
         - block id는 UUID v4 형식 ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx').\n\
         - 새 블록 추가 시 새 UUID 생성. 기존 블록 수정 시 기존 id 사용.\n\
         - 색상은 #RRGGBB 형식.\n\
         - 한국어 요청도 영어 요청도 모두 지원.\n\n\
         지원하는 block type:\n\
         profile, link, heading, text, socials, image, footer, affiliate, sponsored, custom-html, music, video, pinterest, collection, form, email, commerce, support, course\n\n\
         현재 config (참고용):\n```json\n{}\n```",
        serde_json::to_string_pretty(config_json).unwrap_or_default()
    )
}

fn tool_defs() -> Vec<(&'static str, &'static str, serde_json::Value)> {
    vec![
        ("add_block", "Add a new block to the end of the blocks list. block must include id (uuid), type, enabled, and type-specific fields.", serde_json::json!({
            "type": "object",
            "properties": {
                "block": {"type": "object", "description": "Full block JSON"}
            },
            "required": ["block"]
        })),
        ("edit_block", "Edit an existing block by id. patch is a shallow merge over the block.", serde_json::json!({
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "patch": {"type": "object"}
            },
            "required": ["id", "patch"]
        })),
        ("delete_block", "Delete a block by id.", serde_json::json!({
            "type": "object",
            "properties": {"id": {"type": "string"}},
            "required": ["id"]
        })),
        ("reorder_blocks", "Reorder blocks. Provide a fully ordered list of all block ids.", serde_json::json!({
            "type": "object",
            "properties": {"ids": {"type": "array", "items": {"type": "string"}}},
            "required": ["ids"]
        })),
        ("toggle_block", "Enable or disable a block.", serde_json::json!({
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "enabled": {"type": "boolean"}
            },
            "required": ["id", "enabled"]
        })),
        ("update_theme", "Update theme colors. All fields optional.", serde_json::json!({
            "type": "object",
            "properties": {
                "accentColor": {"type": "string"},
                "backgroundColor": {"type": "string"},
                "textColor": {"type": "string"}
            }
        })),
        ("update_profile", "Update profile fields. All fields optional.", serde_json::json!({
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "bio": {"type": "string"},
                "avatarUrl": {"type": "string"}
            }
        })),
        ("set_schedule", "Set or clear a publish/unpublish schedule for a block. ISO8601 strings (e.g. 2026-11-29T00:00:00Z). Pass null or omit to clear.", serde_json::json!({
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "publishAt": {"type": ["string", "null"]},
                "unpublishAt": {"type": ["string", "null"]}
            },
            "required": ["id"]
        })),
    ]
}

fn claude_tools() -> Vec<serde_json::Value> {
    tool_defs()
        .into_iter()
        .map(|(name, desc, schema)| serde_json::json!({
            "name": name,
            "description": desc,
            "input_schema": schema,
        }))
        .collect()
}

fn openai_tools() -> Vec<serde_json::Value> {
    tool_defs()
        .into_iter()
        .map(|(name, desc, schema)| serde_json::json!({
            "type": "function",
            "function": {
                "name": name,
                "description": desc,
                "parameters": schema,
            }
        }))
        .collect()
}

pub async fn chat_anthropic(
    token: &str,
    messages: &[ChatMessage],
    config_json: &serde_json::Value,
) -> Result<ChatResponse, String> {
    let api_messages: Vec<serde_json::Value> = messages
        .iter()
        .filter(|m| m.role != "system")
        .map(|m| serde_json::json!({
            "role": if m.role == "assistant" { "assistant" } else { "user" },
            "content": m.content,
        }))
        .collect();

    let body = serde_json::json!({
        "model": ANTHROPIC_MODEL,
        "max_tokens": 2048,
        "system": system_prompt(config_json),
        "tools": claude_tools(),
        "messages": api_messages,
    });

    let resp = reqwest::Client::new()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", token)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    if !status.is_success() {
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let msg = val["error"]["message"].as_str().unwrap_or(&text).to_string();
        return Err(format!("Anthropic 오류 ({status}): {msg}"));
    }

    let val: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("응답 파싱: {e}"))?;
    let mut out_text = String::new();
    let mut tool_calls = Vec::new();
    if let Some(content) = val["content"].as_array() {
        for block in content {
            match block["type"].as_str() {
                Some("text") => {
                    if let Some(t) = block["text"].as_str() {
                        if !out_text.is_empty() { out_text.push('\n'); }
                        out_text.push_str(t);
                    }
                }
                Some("tool_use") => {
                    tool_calls.push(ToolCall {
                        id: block["id"].as_str().unwrap_or("").to_string(),
                        name: block["name"].as_str().unwrap_or("").to_string(),
                        args: block["input"].clone(),
                    });
                }
                _ => {}
            }
        }
    }

    Ok(ChatResponse { text: out_text, tool_calls })
}

pub async fn chat_openai(
    token: &str,
    messages: &[ChatMessage],
    config_json: &serde_json::Value,
) -> Result<ChatResponse, String> {
    let mut api_messages: Vec<serde_json::Value> = vec![serde_json::json!({
        "role": "system",
        "content": system_prompt(config_json),
    })];
    for m in messages {
        if m.role == "system" { continue; }
        api_messages.push(serde_json::json!({
            "role": if m.role == "assistant" { "assistant" } else { "user" },
            "content": m.content,
        }));
    }

    let body = serde_json::json!({
        "model": OPENAI_MODEL,
        "messages": api_messages,
        "tools": openai_tools(),
    });

    let resp = reqwest::Client::new()
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("네트워크 오류: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("응답 읽기 오류: {e}"))?;
    if !status.is_success() {
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
        let msg = val["error"]["message"].as_str().unwrap_or(&text).to_string();
        return Err(format!("OpenAI 오류 ({status}): {msg}"));
    }

    let val: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("응답 파싱: {e}"))?;
    let msg = &val["choices"][0]["message"];
    let out_text = msg["content"].as_str().unwrap_or("").to_string();
    let mut tool_calls = Vec::new();
    if let Some(calls) = msg["tool_calls"].as_array() {
        for call in calls {
            let name = call["function"]["name"].as_str().unwrap_or("").to_string();
            let args_str = call["function"]["arguments"].as_str().unwrap_or("{}");
            let args: serde_json::Value = serde_json::from_str(args_str).unwrap_or_default();
            tool_calls.push(ToolCall {
                id: call["id"].as_str().unwrap_or("").to_string(),
                name,
                args,
            });
        }
    }

    Ok(ChatResponse { text: out_text, tool_calls })
}
