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

    let profile_count = config
        .blocks
        .iter()
        .filter(|b| matches!(b, Block::Profile { .. }))
        .count();
    if profile_count != 1 {
        errors.push(ValidationError::InvalidProfileBlockCount);
    }

    let mut seen_ids = std::collections::HashSet::new();
    for block in &config.blocks {
        let id = block.id().to_string();
        if !seen_ids.insert(id.clone()) {
            errors.push(ValidationError::DuplicateBlockId { id });
        }

        match block {
            Block::Link { id, title, url, .. } => {
                if title.trim().is_empty() {
                    errors.push(ValidationError::MissingLinkTitle { id: id.clone() });
                }
                if url.trim().is_empty() {
                    errors.push(ValidationError::MissingLinkUrl { id: id.clone() });
                } else if !url.starts_with("http://") && !url.starts_with("https://") {
                    errors.push(ValidationError::InvalidLinkUrl { id: id.clone() });
                }
            }
            Block::Heading { id, text, .. } => {
                if text.trim().is_empty() {
                    errors.push(ValidationError::MissingHeadingText { id: id.clone() });
                }
            }
            _ => {}
        }
    }

    errors
}

fn is_valid_hex(color: &str) -> bool {
    let s = color.trim();
    if !s.starts_with('#') {
        return false;
    }
    let hex = &s[1..];
    (hex.len() == 3 || hex.len() == 6) && hex.chars().all(|c| c.is_ascii_hexdigit())
}
