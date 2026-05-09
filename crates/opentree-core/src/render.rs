use maud::{html, PreEscaped, DOCTYPE};
use crate::config::{Block, Config};

pub fn render_page(config: &Config) -> String {
    let markup = html! {
        (DOCTYPE)
        html lang="en" {
            head {
                meta charset="utf-8";
                meta name="viewport" content="width=device-width, initial-scale=1";
                title { (config.profile.name) }
                link rel="icon" type="image/svg+xml" href="/favicon.svg";
                style { (PreEscaped(render_css(config))) }
            }
            body {
                main id="content" {
                    @for block in &config.blocks {
                        @if block.enabled() {
                            (render_block(block, config))
                        }
                    }
                }
            }
        }
    };
    markup.into_string()
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

        Block::Link { title, url, .. } => html! {
            a class="link-card" href=(url) target="_blank" rel="noopener noreferrer" {
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

        Block::Image { asset_path, alt, url, .. } => html! {
            @if let Some(href) = url {
                a href=(href) target="_blank" rel="noopener noreferrer" {
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

        Block::Affiliate { title, url, utm_source, utm_medium, utm_campaign, .. } => {
            let full_url = build_utm_url(url, utm_source, utm_medium, utm_campaign);
            html! {
                a class="link-card affiliate-card" href=(full_url)
                  target="_blank" rel="noopener noreferrer" {
                    span class="link-title" { (title) }
                    span class="link-badge affiliate-badge" { "제휴" }
                }
            }
        },

        Block::Sponsored { title, url, .. } => html! {
            a class="link-card sponsored-card" href=(url)
              target="_blank" rel="noopener noreferrer" {
                span class="link-title" { (title) }
                span class="link-badge sponsored-badge" { "Sponsored" }
            }
        },

        Block::CustomHtml { html, .. } => html! {
            (PreEscaped(html))
        },
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
    format!(
        r#"
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: {bg};
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
.bio {{ font-size: 0.9rem; opacity: 0.7; }}

.link-card {{
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 16px 24px;
    border: 2px solid {accent};
    border-radius: 8px;
    color: {text};
    text-decoration: none;
    font-weight: 600;
    transition: background-color 0.15s;
    position: relative;
}}
.link-card:hover {{ background-color: {accent}; color: {bg}; }}

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
    border: 2px solid {accent};
    color: {text};
    text-decoration: none;
    font-size: 0.7rem;
    font-weight: 700;
    transition: background-color 0.15s, color 0.15s;
}}
.social-btn:hover {{ background-color: {accent}; color: {bg}; }}

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
