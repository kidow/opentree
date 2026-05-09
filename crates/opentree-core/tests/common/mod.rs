use opentree_core::config::{
    AnalyticsConfig, Background, BackgroundAttribution, Block, ButtonStyle, CollectionLayout,
    CommerceProvider, Config, FormField, FormFieldType, LayoutStyle, LocaleVariant, OembedCache,
    Profile, ProfileOverride, Schedule, SeoConfig, SocialItem, FooterLink, SupportProvider, Theme,
};
use std::collections::HashMap;

/// Stable id generator — keeps snapshots deterministic.
#[allow(dead_code)]
pub fn id(suffix: &str) -> String {
    format!("00000000-0000-4000-8000-{:0>12}", suffix)
}

#[allow(dead_code)]
pub fn minimal_theme() -> Theme {
    Theme {
        accent_color: "#000000".to_string(),
        background_color: "#ffffff".to_string(),
        text_color: "#111111".to_string(),
        border_color: None,
        muted_color: None,
        hover_color: None,
        button_style: ButtonStyle::Outline,
        layout: LayoutStyle::Classic,
        background: None,
        font_family: None,
        custom_css: None,
    }
}

#[allow(dead_code)]
pub fn minimal_config() -> Config {
    Config {
        schema_version: 14,
        profile: Profile {
            name: "Test User".to_string(),
            bio: Some("Bio line".to_string()),
            avatar_url: None,
        },
        blocks: vec![
            Block::Profile { id: id("profile1"), enabled: true },
            Block::Link {
                id: id("link0001"),
                enabled: true,
                title: "GitHub".to_string(),
                url: "https://github.com/example".to_string(),
            },
        ],
        theme: minimal_theme(),
        site_url: None,
        domain: None,
        connections: Vec::new(),
        analytics: None,
        schedules: HashMap::new(),
        seo: None,
        locale: None,
        locale_variants: Vec::new(),
    }
}

/// Config exercising every Block variant (with valid data so it passes validate).
#[allow(dead_code)]
pub fn all_blocks_config() -> Config {
    let mut c = minimal_config();
    c.profile.avatar_url = Some("https://example.com/avatar.jpg".to_string());
    c.site_url = Some("https://example.com".to_string());
    c.locale = Some("en".to_string());
    c.seo = Some(SeoConfig {
        title: Some("Custom title".to_string()),
        description: Some("Custom description".to_string()),
        og_image: None,
    });
    c.blocks = vec![
        Block::Profile { id: id("profile1"), enabled: true },
        Block::Heading { id: id("head0001"), enabled: true, text: "Section".to_string() },
        Block::Text { id: id("text0001"), enabled: true, content: "Hello".to_string() },
        Block::Link {
            id: id("link0001"),
            enabled: true,
            title: "GitHub".to_string(),
            url: "https://github.com/example".to_string(),
        },
        Block::Socials {
            id: id("socials1"),
            enabled: true,
            items: vec![
                SocialItem { platform: "twitter".to_string(), url: "https://twitter.com/x".to_string() },
                SocialItem { platform: "github".to_string(), url: "https://github.com/x".to_string() },
            ],
        },
        Block::Image {
            id: id("image001"),
            enabled: true,
            asset_path: "assets/photo.jpg".to_string(),
            alt: "Photo".to_string(),
            url: Some("https://example.com/photo".to_string()),
        },
        Block::Affiliate {
            id: id("aff00001"),
            enabled: true,
            title: "Product".to_string(),
            url: "https://example.com/buy".to_string(),
            utm_source: Some("opentree".to_string()),
            utm_medium: Some("affiliate".to_string()),
            utm_campaign: None,
        },
        Block::Sponsored {
            id: id("spons001"),
            enabled: true,
            title: "Sponsor".to_string(),
            url: "https://example.com/sponsor".to_string(),
        },
        Block::Music {
            id: id("music001"),
            enabled: true,
            url: "https://open.spotify.com/track/abc123".to_string(),
            oembed_cache: None,
        },
        Block::Video {
            id: id("video001"),
            enabled: true,
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ".to_string(),
            oembed_cache: None,
        },
        Block::Pinterest {
            id: id("pinte001"),
            enabled: true,
            url: "https://www.pinterest.com/example/board".to_string(),
            oembed_cache: None,
        },
        Block::Collection {
            id: id("col00001"),
            enabled: true,
            layout: CollectionLayout::Grid,
            children: vec![
                Block::Link {
                    id: id("colchld1"),
                    enabled: true,
                    title: "Child".to_string(),
                    url: "https://example.com/child".to_string(),
                },
            ],
        },
        Block::Form {
            id: id("form0001"),
            enabled: true,
            formspree_id: "abcdef".to_string(),
            action_url: None,
            provider: None,
            title: "Contact".to_string(),
            submit_label: "Send".to_string(),
            fields: vec![FormField {
                name: "email".to_string(),
                label: "Email".to_string(),
                field_type: FormFieldType::Email,
                required: true,
            }],
        },
        Block::Email {
            id: id("email001"),
            enabled: true,
            convertkit_form_id: "1234567".to_string(),
            action_url: None,
            provider: None,
            title: "Newsletter".to_string(),
            submit_label: "Subscribe".to_string(),
            placeholder: "you@example.com".to_string(),
        },
        Block::Commerce {
            id: id("comm0001"),
            enabled: true,
            provider: CommerceProvider::Stripe,
            url: "https://buy.stripe.com/abc".to_string(),
            label: "Buy Now".to_string(),
            description: None,
            price: Some("$29".to_string()),
        },
        Block::Support {
            id: id("supp0001"),
            enabled: true,
            provider: SupportProvider::Kofi,
            url: "https://ko-fi.com/example".to_string(),
            label: "Buy me a coffee".to_string(),
        },
        Block::Course {
            id: id("course01"),
            enabled: true,
            url: "https://example.com/course".to_string(),
            title: "Course Title".to_string(),
            platform: Some("Teachable".to_string()),
            price: Some("$99".to_string()),
        },
        Block::CustomHtml {
            id: id("chtml001"),
            enabled: true,
            html: "<p>raw</p>".to_string(),
        },
        Block::LanguageSwitcher { id: id("langs001"), enabled: true },
        Block::Footer {
            id: id("footer01"),
            enabled: true,
            text: "© 2026".to_string(),
            links: vec![FooterLink {
                label: "Terms".to_string(),
                url: "https://example.com/terms".to_string(),
            }],
        },
    ];
    c
}

#[allow(dead_code)]
pub fn config_with_schedules() -> Config {
    let mut c = minimal_config();
    let mut schedules = HashMap::new();
    schedules.insert(id("link0001"), Schedule {
        publish_at: Some("2026-01-01T00:00:00Z".to_string()),
        unpublish_at: Some("2026-12-31T23:59:59Z".to_string()),
    });
    c.schedules = schedules;
    c
}

#[allow(dead_code)]
pub fn config_with_locale_variants() -> Config {
    let mut c = minimal_config();
    let mut block_overrides = HashMap::new();
    block_overrides.insert(
        id("link0001"),
        serde_json::json!({ "title": "깃허브" }),
    );
    c.locale_variants = vec![LocaleVariant {
        code: "ko".to_string(),
        path: "ko".to_string(),
        label: Some("한국어".to_string()),
        profile: Some(ProfileOverride {
            name: Some("테스트 유저".to_string()),
            bio: Some("바이오 라인".to_string()),
            avatar_url: None,
        }),
        blocks: block_overrides,
    }];
    c
}

#[allow(dead_code)]
pub fn config_with_analytics() -> Config {
    let mut c = minimal_config();
    c.analytics = Some(AnalyticsConfig {
        provider: "plausible".to_string(),
        domain: "example.com".to_string(),
        self_host_url: None,
    });
    c
}

#[allow(dead_code)]
pub fn config_with_image_background() -> Config {
    let mut c = minimal_config();
    c.theme.background = Some(Background::Image {
        asset_path: String::new(),
        url: Some("https://example.com/bg.jpg".to_string()),
        opacity: Some(0.7),
        attribution: Some(BackgroundAttribution {
            source: "Unsplash".to_string(),
            photographer: "Jane Doe".to_string(),
            photographer_url: Some("https://unsplash.com/@janedoe".to_string()),
            source_url: Some("https://unsplash.com/photos/abc".to_string()),
        }),
    });
    c
}

#[allow(dead_code)] // utility helper, may not be used by every test target
pub fn cache_with_html() -> Option<OembedCache> {
    Some(OembedCache {
        html: Some("<iframe src=\"https://example.com/embed\"></iframe>".to_string()),
        thumbnail_url: None,
        title: Some("Cached title".to_string()),
        author_name: None,
        provider_name: None,
    })
}
