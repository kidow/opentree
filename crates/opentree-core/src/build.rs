use std::path::Path;
use thiserror::Error;
use crate::config::Config;
use crate::render::{render_favicon, render_page_with_time, render_robots, render_sitemap};
use crate::validate::{validate, ValidationError};

#[derive(Debug, Error)]
pub enum BuildError {
    #[error("validation failed: {0:?}")]
    Validation(Vec<ValidationError>),
    #[error("output path is outside the target directory")]
    UnsafePath,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

pub struct BuildOutput {
    pub index_html: String,
    pub favicon_svg: String,
    pub sitemap_xml: String,
    pub robots_txt: String,
}

pub fn build(config: &Config) -> Result<BuildOutput, BuildError> {
    build_with_time(config, None)
}

pub fn build_with_time(config: &Config, now: Option<&str>) -> Result<BuildOutput, BuildError> {
    let errors = validate(config);
    if !errors.is_empty() {
        return Err(BuildError::Validation(errors));
    }

    Ok(BuildOutput {
        index_html: render_page_with_time(config, now),
        favicon_svg: render_favicon(&config.theme.accent_color),
        sitemap_xml: render_sitemap(config),
        robots_txt: render_robots(config),
    })
}

pub fn write_output(output: &BuildOutput, dest: &Path) -> Result<(), BuildError> {
    std::fs::create_dir_all(dest)?;

    let dest_canonical = dest.canonicalize()?;
    let index_path = dest_canonical.join("index.html");
    let favicon_path = dest_canonical.join("favicon.svg");
    let robots_path = dest_canonical.join("robots.txt");
    let sitemap_path = dest_canonical.join("sitemap.xml");

    safe_path_check(&dest_canonical, &index_path)?;
    safe_path_check(&dest_canonical, &favicon_path)?;
    safe_path_check(&dest_canonical, &robots_path)?;
    safe_path_check(&dest_canonical, &sitemap_path)?;

    std::fs::write(&index_path, &output.index_html)?;
    std::fs::write(&favicon_path, &output.favicon_svg)?;
    std::fs::write(&robots_path, &output.robots_txt)?;
    if !output.sitemap_xml.is_empty() {
        std::fs::write(&sitemap_path, &output.sitemap_xml)?;
    }

    Ok(())
}

fn safe_path_check(base: &Path, target: &Path) -> Result<(), BuildError> {
    if !target.starts_with(base) {
        return Err(BuildError::UnsafePath);
    }
    Ok(())
}
