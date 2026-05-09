mod common;

use common::{all_blocks_config, id, minimal_config};
use opentree_core::config::{Block, CollectionLayout, FormField, FormFieldType};
use opentree_core::validate::{validate, ValidationError};

fn has_err<F: Fn(&ValidationError) -> bool>(errors: &[ValidationError], pred: F) -> bool {
    errors.iter().any(pred)
}

#[test]
fn minimal_config_passes() {
    let c = minimal_config();
    let errors = validate(&c);
    assert!(errors.is_empty(), "expected no errors, got {errors:?}");
}

#[test]
fn all_blocks_config_passes() {
    let c = all_blocks_config();
    let errors = validate(&c);
    assert!(errors.is_empty(), "expected no errors, got {errors:?}");
}

#[test]
fn missing_profile_name_caught() {
    let mut c = minimal_config();
    c.profile.name = String::new();
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingProfileName)));
}

#[test]
fn invalid_accent_color_caught() {
    let mut c = minimal_config();
    c.theme.accent_color = "not-a-color".to_string();
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidAccentColor)));
}

#[test]
fn duplicate_profile_blocks_caught() {
    let mut c = minimal_config();
    c.blocks.push(Block::Profile { id: id("profile2"), enabled: true });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidProfileBlockCount)));
}

#[test]
fn duplicate_block_id_caught() {
    let mut c = minimal_config();
    c.blocks.push(Block::Link {
        id: id("link0001"),
        enabled: true,
        title: "Dup".to_string(),
        url: "https://dup.example.com".to_string(),
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::DuplicateBlockId { .. })));
}

#[test]
fn invalid_link_url_caught() {
    let mut c = minimal_config();
    if let Some(Block::Link { url, .. }) = c.blocks.iter_mut().find(|b| matches!(b, Block::Link { .. })) {
        *url = "not-a-url".to_string();
    }
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidLinkUrl { .. })));
}

#[test]
fn missing_link_title_caught() {
    let mut c = minimal_config();
    if let Some(Block::Link { title, .. }) = c.blocks.iter_mut().find(|b| matches!(b, Block::Link { .. })) {
        *title = String::new();
    }
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingLinkTitle { .. })));
}

#[test]
fn missing_image_alt_caught() {
    let mut c = minimal_config();
    c.blocks.push(Block::Image {
        id: id("img00001"),
        enabled: true,
        asset_path: "assets/x.jpg".to_string(),
        alt: String::new(),
        url: None,
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingImageAlt { .. })));
}

#[test]
fn missing_image_source_caught() {
    let mut c = minimal_config();
    c.blocks.push(Block::Image {
        id: id("img00002"),
        enabled: true,
        asset_path: String::new(),
        alt: "Alt".to_string(),
        url: None,
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingImageSource { .. })));
}

#[test]
fn embed_blocks_require_url() {
    let mut c = minimal_config();
    c.blocks.push(Block::Music { id: id("music001"), enabled: true, url: String::new(), oembed_cache: None });
    c.blocks.push(Block::Video { id: id("video001"), enabled: true, url: String::new(), oembed_cache: None });
    c.blocks.push(Block::Pinterest { id: id("pinte001"), enabled: true, url: String::new(), oembed_cache: None });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingMusicUrl { .. })));
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingVideoUrl { .. })));
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingPinterestUrl { .. })));
}

#[test]
fn embed_blocks_url_must_be_valid() {
    let mut c = minimal_config();
    c.blocks.push(Block::Music { id: id("music002"), enabled: true, url: "ftp://x".to_string(), oembed_cache: None });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidMusicUrl { .. })));
}

#[test]
fn collection_rejects_disallowed_child_types() {
    let mut c = minimal_config();
    c.blocks.push(Block::Collection {
        id: id("col00001"),
        enabled: true,
        layout: CollectionLayout::Grid,
        children: vec![Block::Heading {
            id: id("colhead1"),
            enabled: true,
            text: "no".to_string(),
        }],
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidCollectionChild { .. })));
}

#[test]
fn collection_accepts_allowed_child_types() {
    let mut c = minimal_config();
    c.blocks.push(Block::Collection {
        id: id("col00002"),
        enabled: true,
        layout: CollectionLayout::Carousel,
        children: vec![Block::Link {
            id: id("colchld1"),
            enabled: true,
            title: "Child".to_string(),
            url: "https://example.com/child".to_string(),
        }],
    });
    let errors = validate(&c);
    assert!(!has_err(&errors, |e| matches!(e, ValidationError::InvalidCollectionChild { .. })));
}

#[test]
fn form_requires_formspree_and_fields() {
    let mut c = minimal_config();
    c.blocks.push(Block::Form {
        id: id("form0001"),
        enabled: true,
        formspree_id: String::new(),
        action_url: None,
        provider: None,
        title: String::new(),
        submit_label: String::new(),
        fields: vec![],
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingFormspreeId { .. })));
    assert!(has_err(&errors, |e| matches!(e, ValidationError::EmptyFormFields { .. })));
}

#[test]
fn form_field_must_have_name() {
    let mut c = minimal_config();
    c.blocks.push(Block::Form {
        id: id("form0002"),
        enabled: true,
        formspree_id: "abc".to_string(),
        action_url: None,
        provider: None,
        title: String::new(),
        submit_label: String::new(),
        fields: vec![FormField {
            name: String::new(),
            label: "Email".to_string(),
            field_type: FormFieldType::Email,
            required: false,
        }],
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingFormFieldName { .. })));
}

#[test]
fn email_block_requires_convertkit_form_id() {
    let mut c = minimal_config();
    c.blocks.push(Block::Email {
        id: id("email001"),
        enabled: true,
        convertkit_form_id: String::new(),
        action_url: None,
        provider: None,
        title: String::new(),
        submit_label: String::new(),
        placeholder: String::new(),
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingConvertkitFormId { .. })));
}

#[test]
fn commerce_block_validation() {
    let mut c = minimal_config();
    c.blocks.push(Block::Commerce {
        id: id("comm0001"),
        enabled: true,
        provider: opentree_core::config::CommerceProvider::Stripe,
        url: String::new(),
        label: String::new(),
        description: None,
        price: None,
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingCommerceUrl { .. })));
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingCommerceLabel { .. })));
}

#[test]
fn course_block_validation() {
    let mut c = minimal_config();
    c.blocks.push(Block::Course {
        id: id("course01"),
        enabled: true,
        url: "not-a-url".to_string(),
        title: String::new(),
        platform: None,
        price: None,
    });
    let errors = validate(&c);
    assert!(has_err(&errors, |e| matches!(e, ValidationError::InvalidCourseUrl { .. })));
    assert!(has_err(&errors, |e| matches!(e, ValidationError::MissingCourseTitle { .. })));
}
