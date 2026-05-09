mod common;

use common::{config_with_locale_variants, config_with_schedules, minimal_config};
use opentree_core::build::{build, build_with_time, write_output, BuildError};

#[test]
fn build_emits_index_favicon_robots() {
    let c = minimal_config();
    let out = build(&c).expect("build");
    assert!(out.index_html.contains("<!DOCTYPE html>"));
    assert!(out.favicon_svg.contains("<svg"));
    assert!(out.robots_txt.contains("User-agent: *"));
}

#[test]
fn sitemap_only_when_site_url_set() {
    let mut c = minimal_config();
    let out_no = build(&c).expect("build no siteUrl");
    assert!(out_no.sitemap_xml.is_empty(), "sitemap should be empty without siteUrl");

    c.site_url = Some("https://example.com".to_string());
    let out_yes = build(&c).expect("build with siteUrl");
    assert!(out_yes.sitemap_xml.contains("https://example.com/"));
    assert!(out_yes.robots_txt.contains("Sitemap: https://example.com/sitemap.xml"));
}

#[test]
fn validation_failure_aborts_build() {
    let mut c = minimal_config();
    c.profile.name = String::new();
    let res = build(&c);
    assert!(matches!(res, Err(BuildError::Validation(_))));
}

#[test]
fn build_with_time_filters_scheduled_blocks_in_window() {
    let c = config_with_schedules();
    // Inside window — block visible
    let out = build_with_time(&c, Some("2026-06-01T00:00:00Z")).expect("build");
    assert!(out.index_html.contains("GitHub"), "block should be present in window");

    // Before publish_at — block hidden
    let out = build_with_time(&c, Some("2025-12-01T00:00:00Z")).expect("build");
    assert!(!out.index_html.contains("href=\"https://github.com/example\""), "block should be hidden before publishAt");

    // After unpublish_at — block hidden
    let out = build_with_time(&c, Some("2027-06-01T00:00:00Z")).expect("build");
    assert!(!out.index_html.contains("href=\"https://github.com/example\""), "block should be hidden after unpublishAt");
}

#[test]
fn build_without_time_skips_schedule_filter() {
    let c = config_with_schedules();
    let out = build(&c).expect("build");
    // No filtering when now is None — block always present
    assert!(out.index_html.contains("GitHub"));
}

#[test]
fn locale_variants_produce_locale_pages() {
    let c = config_with_locale_variants();
    let out = build(&c).expect("build");
    assert_eq!(out.locale_pages.len(), 1);
    let ko = out.locale_pages.get("ko").expect("ko page");
    assert!(ko.contains("테스트 유저"), "profile name override applied");
    assert!(ko.contains("깃허브"), "block title override applied");
    assert!(ko.contains("<html lang=\"ko\""), "html lang reflects variant code");

    // Primary HTML keeps original
    assert!(out.index_html.contains("Test User"));
    assert!(out.index_html.contains("GitHub"));
}

#[test]
fn write_output_writes_all_files() {
    let mut c = config_with_locale_variants();
    c.site_url = Some("https://example.com".to_string());
    let out = build(&c).expect("build");
    let dir = tempfile::tempdir().expect("tempdir");

    write_output(&out, dir.path()).expect("write");

    assert!(dir.path().join("index.html").exists());
    assert!(dir.path().join("favicon.svg").exists());
    assert!(dir.path().join("robots.txt").exists());
    assert!(dir.path().join("sitemap.xml").exists());
    assert!(dir.path().join("ko/index.html").exists());

    let ko_html = std::fs::read_to_string(dir.path().join("ko/index.html")).expect("read ko");
    assert!(ko_html.contains("테스트 유저"));
}

#[test]
fn write_output_skips_sitemap_when_empty() {
    let c = minimal_config();
    let out = build(&c).expect("build");
    let dir = tempfile::tempdir().expect("tempdir");

    write_output(&out, dir.path()).expect("write");

    assert!(!dir.path().join("sitemap.xml").exists(), "sitemap.xml should not be written when empty");
}
