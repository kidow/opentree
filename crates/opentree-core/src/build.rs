use std::path::Path;
use thiserror::Error;
use crate::config::Config;
use crate::render::{render_favicon, render_page};
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
}

pub fn build(config: &Config) -> Result<BuildOutput, BuildError> {
    let errors = validate(config);
    if !errors.is_empty() {
        return Err(BuildError::Validation(errors));
    }

    Ok(BuildOutput {
        index_html: render_page(config),
        favicon_svg: render_favicon(&config.theme.accent_color),
    })
}

pub fn write_output(output: &BuildOutput, dest: &Path) -> Result<(), BuildError> {
    std::fs::create_dir_all(dest)?;

    let dest_canonical = dest.canonicalize()?;
    let index_path = dest_canonical.join("index.html");
    let favicon_path = dest_canonical.join("favicon.svg");

    safe_path_check(&dest_canonical, &index_path)?;
    safe_path_check(&dest_canonical, &favicon_path)?;

    std::fs::write(&index_path, &output.index_html)?;
    std::fs::write(&favicon_path, &output.favicon_svg)?;

    Ok(())
}

fn safe_path_check(base: &Path, target: &Path) -> Result<(), BuildError> {
    if !target.starts_with(base) {
        return Err(BuildError::UnsafePath);
    }
    Ok(())
}
