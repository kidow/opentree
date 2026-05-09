use crate::config::{Block, Config};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("profile.name is required")]
    MissingProfileName,
    #[error("block {id}: link title is required")]
    MissingLinkTitle { id: String },
    #[error("block {id}: link url is required")]
    MissingLinkUrl { id: String },
    #[error("block {id}: link url is not a valid URL")]
    InvalidLinkUrl { id: String },
    #[error("block {id}: heading text is required")]
    MissingHeadingText { id: String },
    #[error("block {id}: image alt text is required")]
    MissingImageAlt { id: String },
    #[error("block {id}: image must have assetPath or url")]
    MissingImageSource { id: String },
    #[error("block {id}: affiliate title is required")]
    MissingAffiliateTitle { id: String },
    #[error("block {id}: affiliate url is required")]
    MissingAffiliateUrl { id: String },
    #[error("block {id}: affiliate url is not a valid URL")]
    InvalidAffiliateUrl { id: String },
    #[error("block {id}: sponsored title is required")]
    MissingSponsoredTitle { id: String },
    #[error("block {id}: sponsored url is required")]
    MissingSponsoredUrl { id: String },
    #[error("theme.accentColor must be a valid hex color")]
    InvalidAccentColor,
    #[error("theme.backgroundColor must be a valid hex color")]
    InvalidBackgroundColor,
    #[error("theme.textColor must be a valid hex color")]
    InvalidTextColor,
    #[error("exactly one profile block is required")]
    InvalidProfileBlockCount,
    #[error("duplicate block id: {id}")]
    DuplicateBlockId { id: String },
    #[error("block {id}: music url is required")]
    MissingMusicUrl { id: String },
    #[error("block {id}: music url is not a valid URL")]
    InvalidMusicUrl { id: String },
    #[error("block {id}: video url is required")]
    MissingVideoUrl { id: String },
    #[error("block {id}: video url is not a valid URL")]
    InvalidVideoUrl { id: String },
    #[error("block {id}: pinterest url is required")]
    MissingPinterestUrl { id: String },
    #[error("block {id}: pinterest url is not a valid URL")]
    InvalidPinterestUrl { id: String },
    #[error("block {id}: collection child type {child_type} is not allowed")]
    InvalidCollectionChild { id: String, child_type: String },
    #[error("block {id}: formspree form id is required")]
    MissingFormspreeId { id: String },
    #[error("block {id}: form must have at least one field")]
    EmptyFormFields { id: String },
    #[error("block {id}: form field name is required")]
    MissingFormFieldName { id: String },
    #[error("block {id}: convertkit form id is required")]
    MissingConvertkitFormId { id: String },
}

pub fn validate(config: &Config) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    if config.profile.name.trim().is_empty() {
        errors.push(ValidationError::MissingProfileName);
    }

    if !is_valid_hex(&config.theme.accent_color) {
        errors.push(ValidationError::InvalidAccentColor);
    }
    if !is_valid_hex(&config.theme.background_color) {
        errors.push(ValidationError::InvalidBackgroundColor);
    }
    if !is_valid_hex(&config.theme.text_color) {
        errors.push(ValidationError::InvalidTextColor);
    }

    let profile_count = config.blocks.iter().filter(|b| matches!(b, Block::Profile { .. })).count();
    if profile_count != 1 {
        errors.push(ValidationError::InvalidProfileBlockCount);
    }

    let mut seen_ids = std::collections::HashSet::new();
    for block in &config.blocks {
        let id = block.id().to_string();
        if !seen_ids.insert(id.clone()) {
            errors.push(ValidationError::DuplicateBlockId { id: id.clone() });
        }

        match block {
            Block::Link { id, title, url, .. } => {
                if title.trim().is_empty() {
                    errors.push(ValidationError::MissingLinkTitle { id: id.clone() });
                }
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingLinkUrl { id: id.clone() });
                } else if !is_valid_url(url) {
                    errors.push(ValidationError::InvalidLinkUrl { id: id.clone() });
                }
            }
            Block::Heading { id, text, .. } => {
                if text.trim().is_empty() {
                    errors.push(ValidationError::MissingHeadingText { id: id.clone() });
                }
            }
            Block::Image { id, alt, asset_path, url, .. } => {
                if alt.trim().is_empty() {
                    errors.push(ValidationError::MissingImageAlt { id: id.clone() });
                }
                if asset_path.trim().is_empty() && url.is_none() {
                    errors.push(ValidationError::MissingImageSource { id: id.clone() });
                }
            }
            Block::Affiliate { id, title, url, .. } => {
                if title.trim().is_empty() {
                    errors.push(ValidationError::MissingAffiliateTitle { id: id.clone() });
                }
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingAffiliateUrl { id: id.clone() });
                } else if !is_valid_url(url) {
                    errors.push(ValidationError::InvalidAffiliateUrl { id: id.clone() });
                }
            }
            Block::Sponsored { id, title, url, .. } => {
                if title.trim().is_empty() {
                    errors.push(ValidationError::MissingSponsoredTitle { id: id.clone() });
                }
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingSponsoredUrl { id: id.clone() });
                }
            }
            Block::Music { id, url, .. } => {
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingMusicUrl { id: id.clone() });
                } else if !is_valid_url(url) {
                    errors.push(ValidationError::InvalidMusicUrl { id: id.clone() });
                }
            }
            Block::Video { id, url, .. } => {
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingVideoUrl { id: id.clone() });
                } else if !is_valid_url(url) {
                    errors.push(ValidationError::InvalidVideoUrl { id: id.clone() });
                }
            }
            Block::Pinterest { id, url, .. } => {
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingPinterestUrl { id: id.clone() });
                } else if !is_valid_url(url) {
                    errors.push(ValidationError::InvalidPinterestUrl { id: id.clone() });
                }
            }
            Block::Form { id, formspree_id, fields, .. } => {
                if formspree_id.trim().is_empty() {
                    errors.push(ValidationError::MissingFormspreeId { id: id.clone() });
                }
                if fields.is_empty() {
                    errors.push(ValidationError::EmptyFormFields { id: id.clone() });
                }
                for field in fields {
                    if field.name.trim().is_empty() {
                        errors.push(ValidationError::MissingFormFieldName { id: id.clone() });
                    }
                }
            }
            Block::Email { id, convertkit_form_id, .. } => {
                if convertkit_form_id.trim().is_empty() {
                    errors.push(ValidationError::MissingConvertkitFormId { id: id.clone() });
                }
            }
            Block::Collection { id, children, .. } => {
                for child in children {
                    let allowed = matches!(
                        child,
                        Block::Link { .. }
                            | Block::Image { .. }
                            | Block::Music { .. }
                            | Block::Video { .. }
                            | Block::Pinterest { .. }
                    );
                    if !allowed {
                        errors.push(ValidationError::InvalidCollectionChild {
                            id: id.clone(),
                            child_type: child_type_name(child).to_string(),
                        });
                    }
                }
            }
            _ => {}
        }
    }

    errors
}

fn child_type_name(b: &Block) -> &'static str {
    match b {
        Block::Profile { .. } => "profile",
        Block::Link { .. } => "link",
        Block::Heading { .. } => "heading",
        Block::Text { .. } => "text",
        Block::Socials { .. } => "socials",
        Block::Image { .. } => "image",
        Block::Footer { .. } => "footer",
        Block::Affiliate { .. } => "affiliate",
        Block::Sponsored { .. } => "sponsored",
        Block::CustomHtml { .. } => "custom-html",
        Block::Music { .. } => "music",
        Block::Video { .. } => "video",
        Block::Pinterest { .. } => "pinterest",
        Block::Collection { .. } => "collection",
        Block::Form { .. } => "form",
        Block::Email { .. } => "email",
    }
}

fn is_valid_url(url: &str) -> bool {
    url.starts_with("http://") || url.starts_with("https://")
}

fn is_valid_hex(color: &str) -> bool {
    let s = color.trim();
    if !s.starts_with('#') { return false; }
    let hex = &s[1..];
    (hex.len() == 3 || hex.len() == 6) && hex.chars().all(|c| c.is_ascii_hexdigit())
}
