use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub schema_version: u32,
    pub profile: Profile,
    pub blocks: Vec<Block>,
    pub theme: Theme,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub site_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub connections: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum Block {
    #[serde(rename = "profile")]
    Profile { id: String, enabled: bool },
    #[serde(rename = "link")]
    Link {
        id: String,
        enabled: bool,
        title: String,
        url: String,
    },
    #[serde(rename = "heading")]
    Heading {
        id: String,
        enabled: bool,
        text: String,
    },
    #[serde(rename = "text")]
    Text {
        id: String,
        enabled: bool,
        content: String,
    },
}

impl Block {
    pub fn id(&self) -> &str {
        match self {
            Block::Profile { id, .. } => id,
            Block::Link { id, .. } => id,
            Block::Heading { id, .. } => id,
            Block::Text { id, .. } => id,
        }
    }

    pub fn enabled(&self) -> bool {
        match self {
            Block::Profile { enabled, .. } => *enabled,
            Block::Link { enabled, .. } => *enabled,
            Block::Heading { enabled, .. } => *enabled,
            Block::Text { enabled, .. } => *enabled,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Theme {
    pub accent_color: String,
    pub background_color: String,
    pub text_color: String,
}

impl Config {
    pub fn default_config() -> Self {
        Config {
            schema_version: 2,
            profile: Profile {
                name: String::new(),
                bio: None,
                avatar_url: None,
            },
            blocks: vec![
                Block::Profile {
                    id: Uuid::new_v4().to_string(),
                    enabled: true,
                },
                Block::Link {
                    id: Uuid::new_v4().to_string(),
                    enabled: true,
                    title: "My Link".to_string(),
                    url: "https://example.com".to_string(),
                },
            ],
            theme: Theme {
                accent_color: "#000000".to_string(),
                background_color: "#ffffff".to_string(),
                text_color: "#000000".to_string(),
            },
            site_url: None,
            domain: None,
            connections: Vec::new(),
        }
    }

    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}
