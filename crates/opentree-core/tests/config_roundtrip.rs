mod common;

use common::{all_blocks_config, config_with_image_background, config_with_locale_variants, config_with_schedules, minimal_config};
use opentree_core::config::Config;

fn roundtrip(c: &Config) -> Config {
    let json = c.to_json().expect("serialize");
    Config::from_json(&json).expect("deserialize")
}

#[test]
fn minimal_config_roundtrips() {
    let c = minimal_config();
    let r = roundtrip(&c);
    assert_eq!(c.schema_version, r.schema_version);
    assert_eq!(c.profile.name, r.profile.name);
    assert_eq!(c.blocks.len(), r.blocks.len());
}

#[test]
fn all_block_variants_roundtrip() {
    let c = all_blocks_config();
    let r = roundtrip(&c);
    assert_eq!(c.blocks.len(), r.blocks.len());
    for (a, b) in c.blocks.iter().zip(r.blocks.iter()) {
        assert_eq!(a.id(), b.id());
    }
}

#[test]
fn schedules_roundtrip() {
    let c = config_with_schedules();
    let r = roundtrip(&c);
    assert_eq!(c.schedules.len(), r.schedules.len());
    let key = c.schedules.keys().next().unwrap();
    assert_eq!(
        c.schedules.get(key).and_then(|s| s.publish_at.clone()),
        r.schedules.get(key).and_then(|s| s.publish_at.clone()),
    );
}

#[test]
fn locale_variants_roundtrip() {
    let c = config_with_locale_variants();
    let r = roundtrip(&c);
    assert_eq!(c.locale_variants.len(), r.locale_variants.len());
    let v_a = &c.locale_variants[0];
    let v_b = &r.locale_variants[0];
    assert_eq!(v_a.code, v_b.code);
    assert_eq!(v_a.path, v_b.path);
    assert_eq!(v_a.profile.as_ref().and_then(|p| p.name.clone()), v_b.profile.as_ref().and_then(|p| p.name.clone()));
    assert_eq!(v_a.blocks.len(), v_b.blocks.len());
}

#[test]
fn image_background_with_attribution_roundtrips() {
    let c = config_with_image_background();
    let r = roundtrip(&c);
    use opentree_core::config::Background;
    let attr = match &r.theme.background {
        Some(Background::Image { attribution, .. }) => attribution.clone(),
        _ => panic!("expected image background"),
    };
    let attr = attr.expect("attribution preserved");
    assert_eq!(attr.photographer, "Jane Doe");
    assert_eq!(attr.source, "Unsplash");
}

#[test]
fn empty_optional_fields_omitted_from_json() {
    let c = minimal_config();
    let json = c.to_json().expect("serialize");
    // skip_serializing_if Option::is_none should drop these
    assert!(!json.contains("\"siteUrl\""), "siteUrl should be omitted: {json}");
    assert!(!json.contains("\"domain\""), "domain should be omitted");
    assert!(!json.contains("\"analytics\""), "analytics should be omitted");
    assert!(!json.contains("\"seo\""), "seo should be omitted");
    assert!(!json.contains("\"localeVariants\""), "localeVariants should be omitted when empty");
}

#[test]
fn camel_case_in_serialized_json() {
    let c = all_blocks_config();
    let json = c.to_json().expect("serialize");
    assert!(json.contains("\"schemaVersion\""));
    assert!(json.contains("\"avatarUrl\""));
    assert!(json.contains("\"assetPath\""));
    assert!(json.contains("\"utmSource\""));
    assert!(json.contains("\"submitLabel\""));
}
