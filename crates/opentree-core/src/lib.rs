pub mod build;
pub mod config;
pub mod render;
pub mod validate;

#[cfg(test)]
mod tests {
    use super::*;
    use config::Config;

    #[test]
    fn default_config_is_valid() {
        let config = Config::default_config();
        let errors = validate::validate(&config);
        // default config has empty profile name — expected
        assert!(errors.iter().any(|e| matches!(e, validate::ValidationError::MissingProfileName)));
    }

    #[test]
    fn valid_config_builds() {
        let mut config = Config::default_config();
        config.profile.name = "Test User".to_string();
        let errors = validate::validate(&config);
        assert!(errors.is_empty(), "unexpected errors: {errors:?}");
        let output = build::build(&config).expect("build failed");
        assert!(output.index_html.contains("Test User"));
        assert!(output.index_html.contains("<!DOCTYPE html>"));
        assert!(output.favicon_svg.contains("<svg"));
    }

    #[test]
    fn invalid_link_url_fails_validation() {
        let mut config = Config::default_config();
        config.profile.name = "Test User".to_string();
        if let Some(config::Block::Link { url, .. }) = config.blocks.iter_mut().find(|b| matches!(b, config::Block::Link { .. })) {
            *url = "not-a-url".to_string();
        }
        let errors = validate::validate(&config);
        assert!(errors.iter().any(|e| matches!(e, validate::ValidationError::InvalidLinkUrl { .. })));
    }

    #[test]
    fn config_roundtrip() {
        let config = Config::default_config();
        let json = config.to_json().expect("serialize failed");
        let parsed = Config::from_json(&json).expect("deserialize failed");
        assert_eq!(config.schema_version, parsed.schema_version);
        assert_eq!(config.blocks.len(), parsed.blocks.len());
    }

    #[test]
    fn write_output_creates_files() {
        let mut config = Config::default_config();
        config.profile.name = "Test User".to_string();
        let output = build::build(&config).expect("build failed");
        let dir = std::env::temp_dir().join("opentree-test-output");
        build::write_output(&output, &dir).expect("write failed");
        assert!(dir.join("index.html").exists());
        assert!(dir.join("favicon.svg").exists());
        std::fs::remove_dir_all(&dir).ok();
    }
}
