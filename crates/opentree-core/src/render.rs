use maud::{html, DOCTYPE};
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
                style {
                    (render_css(config))
                }
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
            p class="text" { (content) }
        },
    }
}

fn render_css(config: &Config) -> String {
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

.avatar {{
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
}}

.name {{
    font-size: 1.25rem;
    font-weight: 700;
}}

.bio {{
    font-size: 0.9rem;
    opacity: 0.7;
}}

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
}}

.link-card:hover {{
    background-color: {accent};
    color: {bg};
}}

.heading {{
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    align-self: flex-start;
}}

.text {{
    font-size: 0.9rem;
    opacity: 0.7;
    text-align: center;
    line-height: 1.6;
}}
"#,
        bg = config.theme.background_color,
        text = config.theme.text_color,
        accent = config.theme.accent_color,
    )
}

pub fn render_favicon(accent_color: &str) -> String {
    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="{accent}"/>
  <text x="16" y="22" font-size="18" font-family="sans-serif" font-weight="bold"
        text-anchor="middle" fill="white">O</text>
</svg>"#,
        accent = accent_color
    )
}
