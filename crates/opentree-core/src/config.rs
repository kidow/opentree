use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub analytics: Option<AnalyticsConfig>,
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub schedules: HashMap<String, Schedule>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub publish_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unpublish_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsConfig {
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub domain: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub self_host_url: Option<String>,
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
#[serde(rename_all = "camelCase")]
pub struct SocialItem {
    pub platform: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FooterLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OembedCache {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub html: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CollectionLayout {
    Grid,
    Carousel,
}

impl Default for CollectionLayout {
    fn default() -> Self { CollectionLayout::Grid }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FormFieldType {
    Text,
    Email,
    Textarea,
}

impl Default for FormFieldType {
    fn default() -> Self { FormFieldType::Text }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CommerceProvider {
    Stripe,
    Gumroad,
    Lemonsqueezy,
    Polar,
}

impl Default for CommerceProvider {
    fn default() -> Self { CommerceProvider::Stripe }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SupportProvider {
    Stripe,
    Kofi,
    Bmc,
    Paypal,
    Patreon,
}

impl Default for SupportProvider {
    fn default() -> Self { SupportProvider::Stripe }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormField {
    pub name: String,
    pub label: String,
    #[serde(default)]
    pub field_type: FormFieldType,
    #[serde(default)]
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum Block {
    #[serde(rename = "profile")]
    Profile { id: String, enabled: bool },

    #[serde(rename = "link")]
    Link { id: String, enabled: bool, title: String, url: String },

    #[serde(rename = "heading")]
    Heading { id: String, enabled: bool, text: String },

    #[serde(rename = "text")]
    Text { id: String, enabled: bool, content: String },

    #[serde(rename = "socials")]
    Socials {
        id: String,
        enabled: bool,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        items: Vec<SocialItem>,
    },

    #[serde(rename = "image")]
    Image {
        id: String,
        enabled: bool,
        #[serde(default)]
        asset_path: String,
        #[serde(default)]
        alt: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        url: Option<String>,
    },

    #[serde(rename = "footer")]
    Footer {
        id: String,
        enabled: bool,
        #[serde(default)]
        text: String,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        links: Vec<FooterLink>,
    },

    #[serde(rename = "affiliate")]
    Affiliate {
        id: String,
        enabled: bool,
        title: String,
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        utm_source: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        utm_medium: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        utm_campaign: Option<String>,
    },

    #[serde(rename = "sponsored")]
    Sponsored { id: String, enabled: bool, title: String, url: String },

    #[serde(rename = "custom-html")]
    CustomHtml { id: String, enabled: bool, html: String },

    #[serde(rename = "music")]
    Music {
        id: String,
        enabled: bool,
        url: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        oembed_cache: Option<OembedCache>,
    },

    #[serde(rename = "video")]
    Video {
        id: String,
        enabled: bool,
        url: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        oembed_cache: Option<OembedCache>,
    },

    #[serde(rename = "pinterest")]
    Pinterest {
        id: String,
        enabled: bool,
        url: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        oembed_cache: Option<OembedCache>,
    },

    #[serde(rename = "collection")]
    Collection {
        id: String,
        enabled: bool,
        #[serde(default)]
        layout: CollectionLayout,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        children: Vec<Block>,
    },

    #[serde(rename = "form")]
    Form {
        id: String,
        enabled: bool,
        #[serde(default)]
        formspree_id: String,
        #[serde(default)]
        title: String,
        #[serde(default)]
        submit_label: String,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        fields: Vec<FormField>,
    },

    #[serde(rename = "email")]
    Email {
        id: String,
        enabled: bool,
        #[serde(default)]
        convertkit_form_id: String,
        #[serde(default)]
        title: String,
        #[serde(default)]
        submit_label: String,
        #[serde(default)]
        placeholder: String,
    },

    #[serde(rename = "commerce")]
    Commerce {
        id: String,
        enabled: bool,
        #[serde(default)]
        provider: CommerceProvider,
        url: String,
        #[serde(default)]
        label: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        description: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        price: Option<String>,
    },

    #[serde(rename = "support")]
    Support {
        id: String,
        enabled: bool,
        #[serde(default)]
        provider: SupportProvider,
        url: String,
        #[serde(default)]
        label: String,
    },

    #[serde(rename = "course")]
    Course {
        id: String,
        enabled: bool,
        url: String,
        #[serde(default)]
        title: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        platform: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        price: Option<String>,
    },
}

impl Block {
    pub fn id(&self) -> &str {
        match self {
            Block::Profile { id, .. } => id,
            Block::Link { id, .. } => id,
            Block::Heading { id, .. } => id,
            Block::Text { id, .. } => id,
            Block::Socials { id, .. } => id,
            Block::Image { id, .. } => id,
            Block::Footer { id, .. } => id,
            Block::Affiliate { id, .. } => id,
            Block::Sponsored { id, .. } => id,
            Block::CustomHtml { id, .. } => id,
            Block::Music { id, .. } => id,
            Block::Video { id, .. } => id,
            Block::Pinterest { id, .. } => id,
            Block::Collection { id, .. } => id,
            Block::Form { id, .. } => id,
            Block::Email { id, .. } => id,
            Block::Commerce { id, .. } => id,
            Block::Support { id, .. } => id,
            Block::Course { id, .. } => id,
        }
    }

    pub fn enabled(&self) -> bool {
        match self {
            Block::Profile { enabled, .. } => *enabled,
            Block::Link { enabled, .. } => *enabled,
            Block::Heading { enabled, .. } => *enabled,
            Block::Text { enabled, .. } => *enabled,
            Block::Socials { enabled, .. } => *enabled,
            Block::Image { enabled, .. } => *enabled,
            Block::Footer { enabled, .. } => *enabled,
            Block::Affiliate { enabled, .. } => *enabled,
            Block::Sponsored { enabled, .. } => *enabled,
            Block::CustomHtml { enabled, .. } => *enabled,
            Block::Music { enabled, .. } => *enabled,
            Block::Video { enabled, .. } => *enabled,
            Block::Pinterest { enabled, .. } => *enabled,
            Block::Collection { enabled, .. } => *enabled,
            Block::Form { enabled, .. } => *enabled,
            Block::Email { enabled, .. } => *enabled,
            Block::Commerce { enabled, .. } => *enabled,
            Block::Support { enabled, .. } => *enabled,
            Block::Course { enabled, .. } => *enabled,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ButtonStyle {
    Pill,
    Rounded,
    Square,
    Outline,
    Soft,
}

impl Default for ButtonStyle {
    fn default() -> Self { ButtonStyle::Outline }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LayoutStyle {
    Classic,
    Featured,
}

impl Default for LayoutStyle {
    fn default() -> Self { LayoutStyle::Classic }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Background {
    #[serde(rename = "solid")]
    Solid { color: String },
    #[serde(rename = "gradient")]
    Gradient {
        from: String,
        to: String,
        #[serde(default)]
        direction: String,
    },
    #[serde(rename = "image")]
    Image {
        #[serde(default)]
        asset_path: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        url: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        opacity: Option<f64>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Theme {
    pub accent_color: String,
    pub background_color: String,
    pub text_color: String,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub border_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub muted_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hover_color: Option<String>,

    #[serde(default)]
    pub button_style: ButtonStyle,
    #[serde(default)]
    pub layout: LayoutStyle,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<Background>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub font_family: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub custom_css: Option<String>,
}

impl Config {
    pub fn default_config() -> Self {
        Config {
            schema_version: 10,
            profile: Profile { name: String::new(), bio: None, avatar_url: None },
            blocks: vec![
                Block::Profile { id: Uuid::new_v4().to_string(), enabled: true },
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
                border_color: None,
                muted_color: None,
                hover_color: None,
                button_style: ButtonStyle::Outline,
                layout: LayoutStyle::Classic,
                background: None,
                font_family: None,
                custom_css: None,
            },
            site_url: None,
            domain: None,
            connections: Vec::new(),
            analytics: None,
            schedules: HashMap::new(),
        }
    }

    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}
