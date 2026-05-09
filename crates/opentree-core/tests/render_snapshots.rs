mod common;

use common::{
    all_blocks_config, config_with_analytics, config_with_image_background,
    config_with_locale_variants, config_with_schedules, minimal_config,
};
use opentree_core::config::{Background, ButtonStyle, LayoutStyle};
use opentree_core::render::{render_favicon, render_page, render_robots, render_sitemap};

#[test]
fn snapshot_minimal_page() {
    let c = minimal_config();
    let html = render_page(&c);
    insta::assert_snapshot!("minimal_page", html);
}

#[test]
fn snapshot_all_blocks_page() {
    let c = all_blocks_config();
    let html = render_page(&c);
    insta::assert_snapshot!("all_blocks_page", html);
}

#[test]
fn snapshot_analytics_injection() {
    let c = config_with_analytics();
    let html = render_page(&c);
    insta::assert_snapshot!("analytics_plausible", html);
}

#[test]
fn snapshot_image_background_with_attribution() {
    let c = config_with_image_background();
    let html = render_page(&c);
    insta::assert_snapshot!("image_background_credit", html);
}

#[test]
fn snapshot_scheduled_wrapper_emitted() {
    let c = config_with_schedules();
    let html = render_page(&c);
    insta::assert_snapshot!("scheduled_wrapper", html);
}

#[test]
fn snapshot_locale_variant_merge() {
    let c = config_with_locale_variants();
    let variant = &c.locale_variants[0];
    let merged = opentree_core::render::apply_locale_variant(&c, variant);
    let html = render_page(&merged);
    insta::assert_snapshot!("locale_ko_page", html);
}

#[test]
fn snapshot_button_styles_change_css() {
    let mut c = minimal_config();
    c.theme.button_style = ButtonStyle::Pill;
    let pill = render_page(&c);
    c.theme.button_style = ButtonStyle::Soft;
    let soft = render_page(&c);
    insta::assert_snapshot!("button_pill", extract_css(&pill));
    insta::assert_snapshot!("button_soft", extract_css(&soft));
}

#[test]
fn snapshot_featured_layout() {
    let mut c = minimal_config();
    c.theme.layout = LayoutStyle::Featured;
    let html = render_page(&c);
    insta::assert_snapshot!("layout_featured", html);
}

#[test]
fn snapshot_video_background() {
    let mut c = minimal_config();
    c.theme.background = Some(Background::Video {
        asset_path: String::new(),
        url: Some("https://example.com/bg.mp4".to_string()),
        poster: Some("https://example.com/poster.jpg".to_string()),
        opacity: Some(0.6),
    });
    let html = render_page(&c);
    insta::assert_snapshot!("video_background", html);
}

#[test]
fn snapshot_favicon() {
    let svg = render_favicon("#16a34a");
    insta::assert_snapshot!("favicon", svg);
}

#[test]
fn snapshot_sitemap() {
    let mut c = minimal_config();
    c.site_url = Some("https://example.com".to_string());
    insta::assert_snapshot!("sitemap_xml", render_sitemap(&c));
}

#[test]
fn snapshot_robots_with_sitemap() {
    let mut c = minimal_config();
    c.site_url = Some("https://example.com".to_string());
    insta::assert_snapshot!("robots_with_sitemap", render_robots(&c));
}

#[test]
fn snapshot_robots_without_sitemap() {
    let c = minimal_config();
    insta::assert_snapshot!("robots_without_sitemap", render_robots(&c));
}

fn extract_css(html: &str) -> String {
    let start = html.find("<style>").map(|i| i + "<style>".len()).unwrap_or(0);
    let end = html.find("</style>").unwrap_or(html.len());
    html[start..end].to_string()
}
