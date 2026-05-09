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
            _ => {}
        }
    }

    errors
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
