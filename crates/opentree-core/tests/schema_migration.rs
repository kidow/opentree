use opentree_core::build::build;
use opentree_core::config::Config;
use opentree_core::validate::validate;

fn load(name: &str) -> Config {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures").join(name);
    let json = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("read {path:?}: {e}"));
    Config::from_json(&json).unwrap_or_else(|e| panic!("parse {name}: {e}"))
}

#[test]
fn v2_minimal_config_loads() {
    let c = load("v2_minimal.json");
    assert_eq!(c.schema_version, 2);
    assert_eq!(c.profile.name, "Legacy User");
    assert!(c.connections.is_empty(), "missing connections defaults to empty");
    assert!(c.schedules.is_empty(), "missing schedules defaults to empty");
    assert!(c.locale_variants.is_empty());
    assert!(c.analytics.is_none());
    assert!(c.seo.is_none());
}

#[test]
fn v3_config_with_connections_loads() {
    let c = load("v3_with_connections.json");
    assert_eq!(c.schema_version, 3);
    assert_eq!(c.domain.as_deref(), Some("v3.example.com"));
    assert_eq!(c.connections, vec!["vercel".to_string()]);
}

#[test]
fn v6_form_email_blocks_load() {
    let c = load("v6_form_email.json");
    assert_eq!(c.schema_version, 6);
    use opentree_core::config::Block;
    assert!(c.blocks.iter().any(|b| matches!(b, Block::Form { formspree_id, .. } if formspree_id == "abcdef")));
    assert!(c.blocks.iter().any(|b| matches!(b, Block::Email { convertkit_form_id, .. } if convertkit_form_id == "12345")));
}

#[test]
fn v8_analytics_loads() {
    let c = load("v8_analytics.json");
    assert_eq!(c.schema_version, 8);
    let analytics = c.analytics.as_ref().expect("analytics present");
    assert_eq!(analytics.provider, "plausible");
    assert_eq!(analytics.domain, "v8.example.com");
}

#[test]
fn v10_schedules_load() {
    let c = load("v10_schedules.json");
    assert_eq!(c.schema_version, 10);
    let s = c.schedules.values().next().expect("schedule present");
    assert_eq!(s.publish_at.as_deref(), Some("2026-01-01T00:00:00Z"));
}

#[test]
fn legacy_configs_still_build() {
    for name in [
        "v2_minimal.json",
        "v3_with_connections.json",
        "v6_form_email.json",
        "v8_analytics.json",
        "v10_schedules.json",
    ] {
        let c = load(name);
        let errors = validate(&c);
        assert!(errors.is_empty(), "validation failed for {name}: {errors:?}");
        let _ = build(&c).unwrap_or_else(|e| panic!("build failed for {name}: {e}"));
    }
}

#[test]
fn unknown_future_field_is_ignored() {
    let json = r##"{
        "schemaVersion": 99,
        "profile": { "name": "Future" },
        "blocks": [{ "id": "p1", "type": "profile", "enabled": true }],
        "theme": { "accentColor": "#000", "backgroundColor": "#fff", "textColor": "#000" },
        "futureUnknownField": { "anything": true }
    }"##;
    let c = Config::from_json(json).expect("unknown fields should be tolerated");
    assert_eq!(c.schema_version, 99);
}
