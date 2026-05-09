use std::collections::HashMap;
use maud::{html, PreEscaped, DOCTYPE};
use crate::config::{Background, Block, ButtonStyle, CollectionLayout, CommerceProvider, Config, FormFieldType, LayoutStyle, OembedCache, Schedule, SupportProvider};

pub fn render_page(config: &Config) -> String {
    render_page_with_time(config, None)
}

pub fn render_page_with_time(config: &Config, now: Option<&str>) -> String {
    let analytics_head = render_analytics_head(config);
    let analytics_body = render_analytics_body(config);
    let google_font_link = render_google_font_link(config);
    let seo_meta = render_seo_meta(config);
    let json_ld = render_json_ld(config);
    let lang = config.locale.as_deref().filter(|s| !s.is_empty()).unwrap_or("en");
    let title = config
        .seo
        .as_ref()
        .and_then(|s| s.title.clone())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| config.profile.name.clone());
    let layout_class = match config.theme.layout {
        LayoutStyle::Classic => "layout-classic",
        LayoutStyle::Featured => "layout-featured",
    };
    let visible_blocks: Vec<&Block> = config
        .blocks
        .iter()
        .filter(|b| b.enabled() && schedule_visible_at(b.id(), &config.schedules, now))
        .collect();
    let markup = html! {
        (DOCTYPE)
        html lang=(lang) {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1";
                title { (title) }
                link rel="icon" type="image/svg+xml" href="/favicon.svg";
                @if !seo_meta.is_empty() {
                    (PreEscaped(seo_meta))
                }
                @if !google_font_link.is_empty() {
                    (PreEscaped(google_font_link))
                }
                style { (PreEscaped(render_css(config))) }
                @if !json_ld.is_empty() {
                    script type="application/ld+json" { (PreEscaped(json_ld)) }
                }
                @if !analytics_head.is_empty() {
                    (PreEscaped(analytics_head))
                }
            }
            body class=(layout_class) {
                main id="content" {
                    @for block in &visible_blocks {
                        (render_scheduled_wrapper(block, config))
                    }
                }
                @if !analytics_body.is_empty() {
                    script { (PreEscaped(analytics_body)) }
                }
                @if has_schedules(config) {
                    script { (PreEscaped(schedule_runtime_js())) }
                }
            }
        }
    };
    markup.into_string()
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#39;")
}

fn render_seo_meta(config: &Config) -> String {
    let title = config
        .seo
        .as_ref()
        .and_then(|s| s.title.clone())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| config.profile.name.clone());
    let description = config
        .seo
        .as_ref()
        .and_then(|s| s.description.clone())
        .or_else(|| config.profile.bio.clone())
        .unwrap_or_default();
    let og_image = config
        .seo
        .as_ref()
        .and_then(|s| s.og_image.clone())
        .or_else(|| config.profile.avatar_url.clone())
        .unwrap_or_default();
    let url = config.site_url.clone().unwrap_or_default();

    let mut out = String::new();
    if !description.is_empty() {
        out.push_str(&format!("<meta name=\"description\" content=\"{}\">\n", html_escape(&description)));
    }
    out.push_str(&format!("<meta property=\"og:title\" content=\"{}\">\n", html_escape(&title)));
    out.push_str(&format!("<meta property=\"og:type\" content=\"profile\">\n"));
    if !description.is_empty() {
        out.push_str(&format!("<meta property=\"og:description\" content=\"{}\">\n", html_escape(&description)));
    }
    if !og_image.is_empty() {
        out.push_str(&format!("<meta property=\"og:image\" content=\"{}\">\n", html_escape(&og_image)));
    }
    if !url.is_empty() {
        out.push_str(&format!("<meta property=\"og:url\" content=\"{}\">\n", html_escape(&url)));
    }
    out.push_str(&format!("<meta name=\"twitter:card\" content=\"{}\">\n", if og_image.is_empty() { "summary" } else { "summary_large_image" }));
    out.push_str(&format!("<meta name=\"twitter:title\" content=\"{}\">\n", html_escape(&title)));
    if !description.is_empty() {
        out.push_str(&format!("<meta name=\"twitter:description\" content=\"{}\">\n", html_escape(&description)));
    }
    if !og_image.is_empty() {
        out.push_str(&format!("<meta name=\"twitter:image\" content=\"{}\">\n", html_escape(&og_image)));
    }
    out
}

fn render_json_ld(config: &Config) -> String {
    let name = &config.profile.name;
    if name.trim().is_empty() {
        return String::new();
    }
    let mut obj = serde_json::json!({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": name,
    });
    if let Some(bio) = &config.profile.bio {
        if !bio.is_empty() {
            obj["description"] = serde_json::Value::String(bio.clone());
        }
    }
    if let Some(avatar) = &config.profile.avatar_url {
        if !avatar.is_empty() {
            obj["image"] = serde_json::Value::String(avatar.clone());
        }
    }
    if let Some(url) = &config.site_url {
        if !url.is_empty() {
            obj["url"] = serde_json::Value::String(url.clone());
        }
    }
    let urls: Vec<String> = config
        .blocks
        .iter()
        .filter_map(|b| match b {
            Block::Link { url, .. } | Block::Affiliate { url, .. } | Block::Sponsored { url, .. } => Some(url.clone()),
            _ => None,
        })
        .filter(|u| !u.is_empty())
        .collect();
    if !urls.is_empty() {
        obj["sameAs"] = serde_json::Value::Array(urls.into_iter().map(serde_json::Value::String).collect());
    }
    serde_json::to_string(&obj).unwrap_or_default()
}

pub fn render_sitemap(config: &Config) -> String {
    let url = match config.site_url.as_deref().filter(|s| !s.is_empty()) {
        Some(u) => u.trim_end_matches('/').to_string(),
        None => return String::new(),
    };
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"#,
        html_escape(&url)
    )
}

pub fn render_robots(config: &Config) -> String {
    let mut out = String::from("User-agent: *\nAllow: /\n");
    if let Some(url) = config.site_url.as_deref().filter(|s| !s.is_empty()) {
        let trimmed = url.trim_end_matches('/');
        out.push_str(&format!("Sitemap: {trimmed}/sitemap.xml\n"));
    }
    out
}

fn schedule_visible_at(id: &str, schedules: &HashMap<String, Schedule>, now: Option<&str>) -> bool {
    let now = match now {
        Some(n) if !n.is_empty() => n,
        _ => return true,
    };
    let s = match schedules.get(id) {
        Some(s) => s,
        None => return true,
    };
    if let Some(p) = s.publish_at.as_deref() {
        if !p.is_empty() && now < p { return false; }
    }
    if let Some(u) = s.unpublish_at.as_deref() {
        if !u.is_empty() && now >= u { return false; }
    }
    true
}

fn render_scheduled_wrapper(block: &Block, config: &Config) -> maud::Markup {
    let sched = config.schedules.get(block.id());
    match sched {
        Some(s) if s.publish_at.is_some() || s.unpublish_at.is_some() => {
            let publish = s.publish_at.as_deref();
            let unpublish = s.unpublish_at.as_deref();
            html! {
                div class="scheduled"
                    data-schedule-publish=[publish]
                    data-schedule-unpublish=[unpublish] {
                    (render_block(block, config))
                }
            }
        }
        _ => render_block(block, config),
    }
}

fn has_schedules(config: &Config) -> bool {
    config.schedules.values().any(|s| s.publish_at.is_some() || s.unpublish_at.is_some())
}

fn schedule_runtime_js() -> &'static str {
    r#"(function(){function tick(){var now=Date.now();document.querySelectorAll('.scheduled').forEach(function(el){var p=el.dataset.schedulePublish?Date.parse(el.dataset.schedulePublish):null;var u=el.dataset.scheduleUnpublish?Date.parse(el.dataset.scheduleUnpublish):null;var v=true;if(p&&now<p)v=false;if(u&&now>=u)v=false;el.classList.toggle('scheduled-hidden',!v);});}tick();setInterval(tick,60000);})();"#
}

fn render_google_font_link(config: &Config) -> String {
    let font = match &config.theme.font_family {
        Some(f) if !f.trim().is_empty() => f.trim().to_string(),
        _ => return String::new(),
    };
    let family_param = font.replace(' ', "+");
    format!(
        r#"<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={family_param}:wght@400;600;700&display=swap" rel="stylesheet">"#
    )
}

fn render_analytics_head(config: &Config) -> String {
    let analytics = match &config.analytics {
        Some(a) if !a.domain.is_empty() => a,
        _ => return String::new(),
    };
    match analytics.provider.as_str() {
        "plausible" => {
            let base = analytics.self_host_url.as_deref()
                .map(|s| s.trim_end_matches('/'))
                .filter(|s| !s.is_empty())
                .unwrap_or("https://plausible.io");
            format!(
                r#"<script defer data-domain="{}" src="{}/js/script.tagged-events.js"></script>
<script>window.plausible=window.plausible||function(){{(window.plausible.q=window.plausible.q||[]).push(arguments)}}</script>"#,
                analytics.domain, base
            )
        }
        "umami" => {
            let base = analytics.self_host_url.as_deref()
                .map(|s| s.trim_end_matches('/'))
                .filter(|s| !s.is_empty())
                .unwrap_or("https://cloud.umami.is");
            format!(
                r#"<script defer src="{}/script.js" data-website-id="{}"></script>"#,
                base, analytics.domain
            )
        }
        "fathom" => format!(
            r#"<script src="https://cdn.usefathom.com/script.js" data-site="{}" defer></script>"#,
            analytics.domain
        ),
        "ga4" => format!(
            r#"<script async src="https://www.googletagmanager.com/gtag/js?id={mid}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}};gtag('js',new Date());gtag('config','{mid}');</script>"#,
            mid = analytics.domain
        ),
        "cf-analytics" => format!(
            r#"<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "{}"}}'></script>"#,
            analytics.domain
        ),
        _ => String::new(),
    }
}

fn render_analytics_body(config: &Config) -> String {
    let provider = match &config.analytics {
        Some(a) if !a.domain.is_empty() => a.provider.as_str(),
        _ => return String::new(),
    };
    match provider {
        "plausible" => r#"document.querySelectorAll('[data-track-id]').forEach(function(el){el.addEventListener('click',function(){if(typeof window.plausible!=='function')return;window.plausible('BlockClick',{props:{block_id:el.dataset.trackId,block_type:el.dataset.trackType||'',label:el.dataset.trackLabel||''}});});});"#.to_string(),
        "ga4" => r#"document.querySelectorAll('[data-track-id]').forEach(function(el){el.addEventListener('click',function(){if(typeof window.gtag!=='function')return;window.gtag('event','BlockClick',{block_id:el.dataset.trackId,block_type:el.dataset.trackType||'',label:el.dataset.trackLabel||''});});});"#.to_string(),
        _ => String::new(),
    }
}

fn render_block(block: &Block, config: &Config) -> maud::Markup {
    match block {
        Block::Profile { .. } => html! {
            div class="profile" {
                @if let Some(avatar_url) = &config.profile.avatar_url {
                    img class="avatar" src=(avatar_url) alt=(config.profile.name);
                }
                h1 class="name" { (config.profile.name) }
                @if let Some(bio) = &config.profile.bio {
                    p class="bio" { (bio) }
                }
            }
        },

        Block::Link { id, title, url, .. } => html! {
            a class="link-card" href=(url) target="_blank" rel="noopener noreferrer"
              data-track-id=(id) data-track-type="link" data-track-label=(title) {
                span class="link-title" { (title) }
            }
        },

        Block::Heading { text, .. } => html! {
            h2 class="heading" { (text) }
        },

        Block::Text { content, .. } => html! {
            p class="text-block" { (content) }
        },

        Block::Socials { items, .. } => html! {
            div class="socials" {
                @for item in items {
                    a class="social-btn" href=(item.url) target="_blank"
                      rel="noopener noreferrer" title=(item.platform) {
                        (social_abbr(&item.platform))
                    }
                }
            }
        },

        Block::Image { id, asset_path, alt, url, .. } => html! {
            @if let Some(href) = url {
                a href=(href) target="_blank" rel="noopener noreferrer"
                  data-track-id=(id) data-track-type="image" data-track-label=(alt) {
                    img class="image-block" src=(asset_path) alt=(alt);
                }
            } @else {
                img class="image-block" src=(asset_path) alt=(alt);
            }
        },

        Block::Footer { text, links, .. } => html! {
            footer class="footer" {
                @if !text.is_empty() {
                    p class="footer-text" { (text) }
                }
                @if !links.is_empty() {
                    nav class="footer-nav" {
                        @for link in links {
                            a href=(link.url) target="_blank" rel="noopener noreferrer" {
                                (link.label)
                            }
                        }
                    }
                }
            }
        },

        Block::Affiliate { id, title, url, utm_source, utm_medium, utm_campaign, .. } => {
            let full_url = build_utm_url(url, utm_source, utm_medium, utm_campaign);
            html! {
                a class="link-card affiliate-card" href=(full_url)
                  target="_blank" rel="noopener noreferrer"
                  data-track-id=(id) data-track-type="affiliate" data-track-label=(title) {
                    span class="link-title" { (title) }
                    span class="link-badge affiliate-badge" { "제휴" }
                }
            }
        },

        Block::Sponsored { id, title, url, .. } => html! {
            a class="link-card sponsored-card" href=(url)
              target="_blank" rel="noopener noreferrer"
              data-track-id=(id) data-track-type="sponsored" data-track-label=(title) {
                span class="link-title" { (title) }
                span class="link-badge sponsored-badge" { "Sponsored" }
            }
        },

        Block::CustomHtml { html, .. } => html! {
            (PreEscaped(html))
        },

        Block::Music { id, url, oembed_cache, .. } => render_embed(id, "music", url, oembed_cache.as_ref(), music_embed(url), "음악"),
        Block::Video { id, url, oembed_cache, .. } => render_embed(id, "video", url, oembed_cache.as_ref(), video_embed(url), "영상"),
        Block::Pinterest { id, url, oembed_cache, .. } => render_embed(id, "pinterest", url, oembed_cache.as_ref(), pinterest_embed(url), "Pinterest"),

        Block::Collection { layout, children, .. } => {
            let class = match layout {
                CollectionLayout::Grid => "collection collection-grid",
                CollectionLayout::Carousel => "collection collection-carousel",
            };
            html! {
                div class=(class) {
                    @for child in children {
                        @if child.enabled() {
                            (render_block(child, config))
                        }
                    }
                }
            }
        }

        Block::Form { formspree_id, action_url, title, submit_label, fields, .. } => {
            let action = match action_url {
                Some(u) if !u.trim().is_empty() => u.clone(),
                _ => format!("https://formspree.io/f/{formspree_id}"),
            };
            let submit = if submit_label.is_empty() { "Send" } else { submit_label.as_str() };
            html! {
                form class="form-block" action=(action) method="POST" {
                    @if !title.is_empty() { h3 class="form-title" { (title) } }
                    @for field in fields {
                        @match field.field_type {
                            FormFieldType::Textarea => {
                                textarea
                                    name=(field.name)
                                    placeholder=(field.label)
                                    rows="4"
                                    required[field.required] {}
                            },
                            FormFieldType::Email => {
                                input
                                    type="email"
                                    name=(field.name)
                                    placeholder=(field.label)
                                    required[field.required];
                            },
                            FormFieldType::Text => {
                                input
                                    type="text"
                                    name=(field.name)
                                    placeholder=(field.label)
                                    required[field.required];
                            },
                        }
                    }
                    button type="submit" class="form-submit" { (submit) }
                }
            }
        }

        Block::Commerce { id, provider, url, label, description, price, .. } => {
            let provider_label = commerce_provider_label(*provider);
            html! {
                a class="link-card commerce-card" href=(url) target="_blank" rel="noopener noreferrer"
                  data-track-id=(id) data-track-type="commerce" data-track-label=(label) {
                    div class="commerce-info" {
                        span class="commerce-provider" { (provider_label) }
                        span class="link-title" { (label) }
                        @if let Some(d) = description { @if !d.is_empty() {
                            span class="commerce-desc" { (d) }
                        }}
                    }
                    @if let Some(p) = price { @if !p.is_empty() {
                        span class="commerce-price" { (p) }
                    }}
                }
            }
        }

        Block::Support { id, provider, url, label, .. } => {
            let provider_label = support_provider_label(*provider);
            let display = if label.is_empty() { provider_label.to_string() } else { label.clone() };
            html! {
                a class="link-card support-card" href=(url) target="_blank" rel="noopener noreferrer"
                  data-track-id=(id) data-track-type="support" data-track-label=(display) {
                    span class="support-icon" { (provider_label) }
                    span class="link-title" { (display) }
                }
            }
        }

        Block::Course { id, url, title, platform, price, .. } => html! {
            a class="link-card course-card" href=(url) target="_blank" rel="noopener noreferrer"
              data-track-id=(id) data-track-type="course" data-track-label=(title) {
                div class="commerce-info" {
                    @if let Some(pl) = platform { @if !pl.is_empty() {
                        span class="commerce-provider" { (pl) }
                    }}
                    span class="link-title" { (title) }
                }
                @if let Some(p) = price { @if !p.is_empty() {
                    span class="commerce-price" { (p) }
                }}
            }
        },

        Block::Email { convertkit_form_id, action_url, provider, title, submit_label, placeholder, .. } => {
            let action = match action_url {
                Some(u) if !u.trim().is_empty() => u.clone(),
                _ => format!("https://app.kit.com/forms/{convertkit_form_id}/subscriptions"),
            };
            let field_name = email_field_name(provider.as_deref());
            let submit = if submit_label.is_empty() { "Subscribe" } else { submit_label.as_str() };
            let ph = if placeholder.is_empty() { "you@example.com" } else { placeholder.as_str() };
            html! {
                form class="form-block email-block" action=(action) method="POST" target="_blank" {
                    @if !title.is_empty() { h3 class="form-title" { (title) } }
                    input type="email" name=(field_name) placeholder=(ph) required;
                    button type="submit" class="form-submit" { (submit) }
                }
            }
        }
    }
}

fn render_embed(
    id: &str,
    block_type: &str,
    url: &str,
    cache: Option<&OembedCache>,
    auto: Option<String>,
    fallback_label: &str,
) -> maud::Markup {
    if let Some(c) = cache {
        if let Some(html_str) = &c.html {
            return html! { div class="embed-block" data-track-id=(id) data-track-type=(block_type) { (PreEscaped(html_str)) } };
        }
    }
    if let Some(html_str) = auto {
        return html! { div class="embed-block" data-track-id=(id) data-track-type=(block_type) { (PreEscaped(html_str)) } };
    }
    html! {
        a class="link-card embed-fallback" href=(url) target="_blank" rel="noopener noreferrer"
          data-track-id=(id) data-track-type=(block_type) data-track-label=(fallback_label) {
            span class="link-title" { (fallback_label) }
            span class="link-url" { (url) }
        }
    }
}

fn music_embed(url: &str) -> Option<String> {
    if let Some(rest) = url.strip_prefix("https://open.spotify.com/") {
        let parts: Vec<&str> = rest.split('/').collect();
        if parts.len() >= 2 {
            let kind = parts[0];
            let id = parts[1].split('?').next().unwrap_or("");
            if matches!(kind, "track" | "album" | "playlist" | "artist" | "episode" | "show") && !id.is_empty() {
                return Some(format!(
                    r#"<iframe src="https://open.spotify.com/embed/{kind}/{id}" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>"#
                ));
            }
        }
    }
    if let Some(rest) = url.strip_prefix("https://music.apple.com/") {
        return Some(format!(
            r#"<iframe src="https://embed.music.apple.com/{rest}" width="100%" height="175" frameborder="0" allow="autoplay *; encrypted-media *; clipboard-write" loading="lazy"></iframe>"#
        ));
    }
    if url.starts_with("https://soundcloud.com/") {
        let encoded = url_encode(url);
        return Some(format!(
            r#"<iframe src="https://w.soundcloud.com/player/?url={encoded}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true" width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" loading="lazy"></iframe>"#
        ));
    }
    None
}

fn video_embed(url: &str) -> Option<String> {
    let yt_id = if let Some(rest) = url.strip_prefix("https://www.youtube.com/watch?v=") {
        Some(rest.split(&['&', '#'][..]).next().unwrap_or(""))
    } else if let Some(rest) = url.strip_prefix("https://youtu.be/") {
        Some(rest.split(&['?', '/', '#'][..]).next().unwrap_or(""))
    } else if let Some(rest) = url.strip_prefix("https://www.youtube.com/embed/") {
        Some(rest.split(&['?', '/', '#'][..]).next().unwrap_or(""))
    } else if let Some(rest) = url.strip_prefix("https://www.youtube.com/shorts/") {
        Some(rest.split(&['?', '/', '#'][..]).next().unwrap_or(""))
    } else {
        None
    };
    if let Some(id) = yt_id {
        if !id.is_empty() {
            return Some(format!(
                r#"<iframe src="https://www.youtube.com/embed/{id}" width="100%" style="aspect-ratio:16/9" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>"#
            ));
        }
    }
    if let Some(rest) = url.strip_prefix("https://vimeo.com/") {
        let id = rest.split(&['?', '/', '#'][..]).next().unwrap_or("");
        if id.chars().all(|c| c.is_ascii_digit()) && !id.is_empty() {
            return Some(format!(
                r#"<iframe src="https://player.vimeo.com/video/{id}" width="100%" style="aspect-ratio:16/9" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>"#
            ));
        }
    }
    None
}

fn pinterest_embed(url: &str) -> Option<String> {
    if !url.contains("pinterest.") {
        return None;
    }
    Some(format!(
        r#"<a data-pin-do="embedPin" data-pin-width="medium" href="{url}"></a><script async defer src="//assets.pinterest.com/js/pinit.js"></script>"#
    ))
}

fn url_encode(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => out.push(c),
            _ => {
                let mut buf = [0u8; 4];
                let bytes = c.encode_utf8(&mut buf).as_bytes().to_vec();
                for b in bytes {
                    out.push_str(&format!("%{:02X}", b));
                }
            }
        }
    }
    out
}

fn email_field_name(provider: Option<&str>) -> &'static str {
    match provider.unwrap_or("kit") {
        "mailchimp" => "EMAIL",
        "klaviyo" => "email",
        "buttondown" => "email",
        _ => "email_address",
    }
}

fn render_body_background(config: &Config) -> String {
    match &config.theme.background {
        Some(Background::Solid { color }) => format!("background-color: {color};"),
        Some(Background::Gradient { from, to, direction }) => {
            let dir = if direction.trim().is_empty() { "to bottom" } else { direction.as_str() };
            format!("background: linear-gradient({dir}, {from}, {to}); background-attachment: fixed;")
        }
        Some(Background::Image { asset_path, url, opacity }) => {
            let src = if !asset_path.is_empty() { asset_path.clone() } else { url.clone().unwrap_or_default() };
            if src.is_empty() {
                format!("background-color: {};", config.theme.background_color)
            } else {
                let op = opacity.unwrap_or(1.0).clamp(0.0, 1.0);
                if (op - 1.0).abs() < f64::EPSILON {
                    format!("background-color: {}; background-image: url('{}'); background-size: cover; background-position: center; background-attachment: fixed;", config.theme.background_color, src)
                } else {
                    let overlay = format!("rgba(0,0,0,{:.2})", 1.0 - op);
                    format!("background-color: {}; background-image: linear-gradient({overlay}, {overlay}), url('{}'); background-size: cover; background-position: center; background-attachment: fixed;", config.theme.background_color, src)
                }
            }
        }
        None => format!("background-color: {};", config.theme.background_color),
    }
}

fn render_button_hover(style: &ButtonStyle, hover: &str, bg: &str) -> String {
    match style {
        ButtonStyle::Outline => format!("background-color: {hover}; color: {bg}; border-color: {hover};"),
        _ => "opacity: 0.85; transform: translateY(-1px);".to_string(),
    }
}

fn render_button_style(style: &ButtonStyle, accent: &str, bg: &str, text: &str) -> String {
    match style {
        ButtonStyle::Pill => format!(
            "background-color: {accent}; color: {bg}; border: none; border-radius: 9999px;"
        ),
        ButtonStyle::Rounded => format!(
            "background-color: {accent}; color: {bg}; border: none; border-radius: 12px;"
        ),
        ButtonStyle::Square => format!(
            "background-color: {accent}; color: {bg}; border: none; border-radius: 0;"
        ),
        ButtonStyle::Outline => format!(
            "background-color: transparent; color: {text}; border: 2px solid {accent}; border-radius: 8px;"
        ),
        ButtonStyle::Soft => format!(
            "background-color: color-mix(in srgb, {accent} 12%, transparent); color: {accent}; border: none; border-radius: 12px;"
        ),
    }
}

fn commerce_provider_label(p: CommerceProvider) -> &'static str {
    match p {
        CommerceProvider::Stripe => "Stripe",
        CommerceProvider::Gumroad => "Gumroad",
        CommerceProvider::Lemonsqueezy => "Lemon Squeezy",
        CommerceProvider::Polar => "Polar",
    }
}

fn support_provider_label(p: SupportProvider) -> &'static str {
    match p {
        SupportProvider::Stripe => "Stripe",
        SupportProvider::Kofi => "Ko-fi",
        SupportProvider::Bmc => "Buy Me a Coffee",
        SupportProvider::Paypal => "PayPal",
        SupportProvider::Patreon => "Patreon",
    }
}

fn social_abbr(platform: &str) -> String {
    match platform.to_lowercase().as_str() {
        "twitter" | "x" => "X".to_string(),
        "instagram" => "Ig".to_string(),
        "facebook" => "Fb".to_string(),
        "linkedin" => "Li".to_string(),
        "youtube" => "YT".to_string(),
        "tiktok" => "TT".to_string(),
        "github" => "GH".to_string(),
        "discord" => "Dc".to_string(),
        "telegram" => "Tg".to_string(),
        "snapchat" => "Sc".to_string(),
        "pinterest" => "Pi".to_string(),
        "reddit" => "Re".to_string(),
        "twitch" => "Tw".to_string(),
        "spotify" => "Sp".to_string(),
        "medium" => "Me".to_string(),
        "substack" => "Su".to_string(),
        "behance" => "Be".to_string(),
        "dribbble" => "Dr".to_string(),
        _ => platform.chars().take(2).collect::<String>().to_uppercase(),
    }
}

fn build_utm_url(
    url: &str,
    source: &Option<String>,
    medium: &Option<String>,
    campaign: &Option<String>,
) -> String {
    let mut params: Vec<String> = Vec::new();
    if let Some(s) = source { if !s.is_empty() { params.push(format!("utm_source={s}")); } }
    if let Some(m) = medium { if !m.is_empty() { params.push(format!("utm_medium={m}")); } }
    if let Some(c) = campaign { if !c.is_empty() { params.push(format!("utm_campaign={c}")); } }
    if params.is_empty() { return url.to_string(); }
    let sep = if url.contains('?') { '&' } else { '?' };
    format!("{url}{sep}{}", params.join("&"))
}

fn render_css(config: &Config) -> String {
    let bg = &config.theme.background_color;
    let text = &config.theme.text_color;
    let accent = &config.theme.accent_color;
    let border = config.theme.border_color.as_deref().unwrap_or(accent);
    let muted = config
        .theme
        .muted_color
        .as_deref()
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("color-mix(in srgb, {text} 55%, transparent)"));
    let hover = config.theme.hover_color.as_deref().unwrap_or(accent);
    let body_background = render_body_background(config);
    let font_stack = config
        .theme
        .font_family
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .map(|f| format!(r#"'{}', "#, f.trim()))
        .unwrap_or_default();
    let button_css = render_button_style(&config.theme.button_style, accent, bg, text);
    let button_hover = render_button_hover(&config.theme.button_style, hover, bg);
    let custom = config
        .theme
        .custom_css
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("");
    format!(
        r#"
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
    font-family: {font_stack}-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    {body_background}
    color: {text};
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 48px 16px;
}}

#content {{
    width: 100%;
    max-width: 680px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}}

.profile {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    text-align: center;
}}

.avatar {{ width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }}
.name {{ font-size: 1.25rem; font-weight: 700; }}
.bio {{ font-size: 0.9rem; color: {muted}; }}

.link-card {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 16px 24px;
    text-decoration: none;
    font-weight: 600;
    transition: background-color 0.15s, transform 0.15s, opacity 0.15s;
    position: relative;
    {button_css}
}}
.link-card:hover {{ {button_hover} }}

.affiliate-card, .sponsored-card {{ justify-content: space-between; }}

.link-badge {{
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
}}
.affiliate-badge {{ background: rgba(234,179,8,0.15); color: #b45309; }}
.sponsored-badge {{ background: rgba(107,114,128,0.15); color: #6b7280; }}

.heading {{
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    align-self: flex-start;
}}

.text-block {{ font-size: 0.9rem; opacity: 0.7; text-align: center; line-height: 1.6; }}

.socials {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    width: 100%;
}}

.social-btn {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid {border};
    color: {text};
    text-decoration: none;
    font-size: 0.7rem;
    font-weight: 700;
    transition: background-color 0.15s, color 0.15s;
}}
.social-btn:hover {{ background-color: {hover}; color: {bg}; }}

.image-block {{ max-width: 100%; height: auto; border-radius: 8px; }}

.footer {{
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
}}
.footer-text {{ font-size: 0.8rem; opacity: 0.5; text-align: center; }}
.footer-nav {{ display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }}
.footer-nav a {{
    font-size: 0.8rem;
    color: {text};
    opacity: 0.6;
    text-decoration: none;
}}
.footer-nav a:hover {{ opacity: 1; }}

.embed-block {{
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0,0,0,0.04);
}}
.embed-block iframe {{ display: block; border: 0; width: 100%; }}
.embed-fallback .link-url {{ font-size: 0.7rem; opacity: 0.6; margin-left: 8px; }}

.collection {{ width: 100%; }}
.collection-grid {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}}
.collection-carousel {{
    display: flex;
    overflow-x: auto;
    gap: 8px;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
}}
.collection-carousel > * {{
    flex: 0 0 80%;
    scroll-snap-align: start;
}}

.form-block {{
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border: 2px solid {border};
    border-radius: 8px;
    background: rgba(0,0,0,0.02);
}}
.form-title {{ font-size: 0.95rem; font-weight: 600; }}
.form-block input, .form-block textarea {{
    padding: 10px 12px;
    border: 1px solid {border};
    border-radius: 6px;
    background: {bg};
    color: {text};
    font-family: inherit;
    font-size: 0.9rem;
    width: 100%;
    box-sizing: border-box;
}}
.form-block textarea {{ resize: vertical; min-height: 80px; }}
.form-submit {{
    padding: 10px 16px;
    background: {accent};
    color: {bg};
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
}}
.form-submit:hover {{ opacity: 0.85; }}
.email-block {{ flex-direction: row; flex-wrap: wrap; align-items: center; }}
.email-block .form-title {{ width: 100%; }}
.email-block input {{ flex: 1; min-width: 180px; }}

.commerce-card, .support-card, .course-card {{
    justify-content: space-between;
    align-items: center;
    text-align: left;
}}
.commerce-info {{
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}}
.commerce-provider {{
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
    font-weight: 600;
}}
.commerce-desc {{ font-size: 0.75rem; opacity: 0.7; font-weight: 400; }}
.commerce-price {{
    font-size: 0.95rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(0,0,0,0.06);
    flex-shrink: 0;
}}
.link-card:hover .commerce-price {{ background: rgba(255,255,255,0.18); }}
.support-icon {{
    font-size: 0.7rem;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(0,0,0,0.06);
    margin-right: 8px;
}}

body.layout-featured #content > .link-card:first-of-type,
body.layout-featured #content .profile + .link-card,
body.layout-featured #content .profile + * + .link-card {{
    padding: 28px 24px;
    font-size: 1.1rem;
    box-shadow: 0 4px 20px color-mix(in srgb, {accent} 25%, transparent);
}}

.scheduled {{ display: contents; }}
.scheduled.scheduled-hidden {{ display: none !important; }}

a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {{
    outline: 2px solid {accent};
    outline-offset: 2px;
    border-radius: 4px;
}}

@media (prefers-reduced-motion: reduce) {{
    *, *::before, *::after {{
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
    }}
}}

{custom}
"#
    )
}

pub fn render_favicon(accent_color: &str) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="{accent_color}"/>
  <text x="16" y="22" font-size="18" font-family="sans-serif" font-weight="bold"
        text-anchor="middle" fill="white">O</text>
</svg>"#
    )
}
