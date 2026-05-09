use sha2::{Digest, Sha256};
use std::io::Cursor;
use std::path::Path;

const MAX_FILE_SIZE: u64 = 5 * 1024 * 1024;

pub fn import_asset(src_path: &str, project_path: &str, role: &str) -> Result<String, String> {
    let src = Path::new(src_path);

    let metadata = std::fs::metadata(src).map_err(|e| format!("파일 읽기 오류: {e}"))?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(format!(
            "파일 크기가 5MB를 초과합니다 ({:.1}MB)",
            metadata.len() as f64 / 1024.0 / 1024.0
        ));
    }

    let bytes = std::fs::read(src).map_err(|e| format!("파일 읽기 오류: {e}"))?;
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    let processed = resize_if_needed(&bytes, &ext, role).unwrap_or_else(|_| bytes.clone());

    let mut hasher = Sha256::new();
    hasher.update(&processed);
    let hash = format!("{:x}", hasher.finalize());
    let hash_short = &hash[..8];

    let assets_dir = Path::new(project_path).join("assets");
    std::fs::create_dir_all(&assets_dir).map_err(|e| format!("폴더 생성 오류: {e}"))?;

    let filename = format!("{role}-{hash_short}.{ext}");
    let dest = assets_dir.join(&filename);
    if !dest.exists() {
        std::fs::write(&dest, &processed).map_err(|e| format!("파일 저장 오류: {e}"))?;
    }

    Ok(format!("assets/{filename}"))
}

fn resize_if_needed(bytes: &[u8], ext: &str, role: &str) -> Result<Vec<u8>, String> {
    let max_w: u32 = match role {
        "avatar" => 512,
        "background" => 2560,
        _ => 1920,
    };
    let max_h: u32 = if role == "avatar" { 512 } else { u32::MAX };

    let img = image::ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    if img.width() <= max_w && img.height() <= max_h {
        return Ok(bytes.to_vec());
    }

    let resized = img.resize(max_w, max_h, image::imageops::FilterType::Lanczos3);
    let mut out = Cursor::new(Vec::new());
    let fmt = match ext {
        "jpg" | "jpeg" => image::ImageFormat::Jpeg,
        "gif" => image::ImageFormat::Gif,
        _ => image::ImageFormat::Png,
    };
    resized.write_to(&mut out, fmt).map_err(|e| e.to_string())?;
    Ok(out.into_inner())
}
