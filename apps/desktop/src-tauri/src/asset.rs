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

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb, ImageFormat};
    use std::io::Cursor;
    use tempfile::TempDir;

    /// Generate a synthetic image of the given size + format and write it to
    /// `dir/name.ext`. Returns the absolute path to the file.
    fn write_image(dir: &TempDir, name: &str, width: u32, height: u32, ext: &str) -> std::path::PathBuf {
        let buf: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(width, height, |x, y| {
            Rgb([(x % 255) as u8, (y % 255) as u8, 128])
        });
        let format = match ext {
            "jpg" | "jpeg" => ImageFormat::Jpeg,
            "gif" => ImageFormat::Gif,
            _ => ImageFormat::Png,
        };
        let mut bytes = Cursor::new(Vec::new());
        buf.write_to(&mut bytes, format).expect("encode");
        let path = dir.path().join(format!("{name}.{ext}"));
        std::fs::write(&path, bytes.into_inner()).expect("write");
        path
    }

    fn decode_dim(path: &std::path::Path) -> (u32, u32) {
        let img = image::ImageReader::open(path).expect("open").decode().expect("decode");
        (img.width(), img.height())
    }

    #[test]
    fn rejects_files_over_5mb() {
        let dir = TempDir::new().unwrap();
        let big = dir.path().join("big.bin");
        std::fs::write(&big, vec![0u8; 5 * 1024 * 1024 + 1]).unwrap();

        let project = TempDir::new().unwrap();
        let res = import_asset(big.to_str().unwrap(), project.path().to_str().unwrap(), "image");
        let err = res.expect_err("should reject");
        assert!(err.contains("5MB"));
    }

    #[test]
    fn missing_source_returns_error() {
        let project = TempDir::new().unwrap();
        let res = import_asset("/path/that/does/not/exist.png", project.path().to_str().unwrap(), "image");
        assert!(res.is_err());
    }

    #[test]
    fn small_image_preserved_with_role_prefix_and_extension() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "logo", 100, 100, "png");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").expect("ok");

        assert!(rel.starts_with("assets/image-"));
        assert!(rel.ends_with(".png"));
        let written = project.path().join(&rel);
        assert!(written.exists(), "asset file should exist on disk");
        let (w, h) = decode_dim(&written);
        assert_eq!((w, h), (100, 100), "small image should not be resized");
    }

    #[test]
    fn output_path_format_is_role_dash_hash_dot_ext() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "pic", 50, 50, "jpg");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "avatar").expect("ok");

        // assets/avatar-XXXXXXXX.jpg with 8-char hex hash
        let captured = regex_pieces(&rel);
        assert_eq!(captured.role, "avatar");
        assert_eq!(captured.ext, "jpg");
        assert_eq!(captured.hash.len(), 8);
        assert!(captured.hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn dedup_same_content_writes_once() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "dedup", 200, 200, "png");

        let project = TempDir::new().unwrap();
        let rel1 = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        let rel2 = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        assert_eq!(rel1, rel2, "same content should produce same hashed filename");

        let entries: Vec<_> = std::fs::read_dir(project.path().join("assets")).unwrap().collect();
        assert_eq!(entries.len(), 1, "dedup should produce a single asset file");
    }

    #[test]
    fn different_content_produces_different_filenames() {
        let src_dir = TempDir::new().unwrap();
        let a = write_image(&src_dir, "a", 100, 100, "png");
        let b = write_image(&src_dir, "b", 120, 120, "png");

        let project = TempDir::new().unwrap();
        let rel_a = import_asset(a.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        let rel_b = import_asset(b.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        assert_ne!(rel_a, rel_b);
    }

    #[test]
    fn avatar_role_resizes_to_512_max() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "huge", 1024, 1024, "png");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "avatar").unwrap();
        let written = project.path().join(&rel);
        let (w, h) = decode_dim(&written);
        assert!(w <= 512);
        assert!(h <= 512);
    }

    #[test]
    fn image_role_resizes_to_1920_max_width() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "wide", 4000, 1000, "png");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        let (w, _h) = decode_dim(&project.path().join(&rel));
        assert!(w <= 1920, "image role should cap width at 1920, got {w}");
    }

    #[test]
    fn background_role_resizes_to_2560_max_width() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "bg", 5000, 1200, "png");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "background").unwrap();
        let (w, _h) = decode_dim(&project.path().join(&rel));
        assert!(w <= 2560, "background role should cap width at 2560, got {w}");
    }

    #[test]
    fn assets_folder_is_created_if_missing() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "pic", 50, 50, "png");

        let project = TempDir::new().unwrap();
        // assets/ does not exist yet
        assert!(!project.path().join("assets").exists());

        import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        assert!(project.path().join("assets").is_dir());
    }

    #[test]
    fn jpeg_extension_preserved_through_resize() {
        let src_dir = TempDir::new().unwrap();
        let src = write_image(&src_dir, "wide", 3500, 800, "jpg");

        let project = TempDir::new().unwrap();
        let rel = import_asset(src.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        assert!(rel.ends_with(".jpg"));
        // Decoded file should still be a valid JPEG
        let written = project.path().join(&rel);
        let bytes = std::fs::read(&written).unwrap();
        assert!(bytes.starts_with(&[0xFF, 0xD8, 0xFF]), "should be JPEG signature");
    }

    #[test]
    fn extension_is_lowercased() {
        let src_dir = TempDir::new().unwrap();
        let src_upper = src_dir.path().join("upper.JPG");
        // Build a tiny JPEG and write under uppercase name.
        let buf: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(20, 20, |_x, _y| Rgb([10u8, 20, 30]));
        let mut bytes = Cursor::new(Vec::new());
        buf.write_to(&mut bytes, ImageFormat::Jpeg).unwrap();
        std::fs::write(&src_upper, bytes.into_inner()).unwrap();

        let project = TempDir::new().unwrap();
        let rel = import_asset(src_upper.to_str().unwrap(), project.path().to_str().unwrap(), "image").unwrap();
        assert!(rel.ends_with(".jpg"), "extension should be lowercased: {rel}");
    }

    // ── resize_if_needed direct tests ────────────────────────────────────────

    #[test]
    fn resize_if_needed_returns_original_when_within_limits() {
        let buf: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(50, 50, |_x, _y| Rgb([0u8, 0, 0]));
        let mut bytes = Cursor::new(Vec::new());
        buf.write_to(&mut bytes, ImageFormat::Png).unwrap();
        let original = bytes.into_inner();

        let resized = resize_if_needed(&original, "png", "image").unwrap();
        assert_eq!(resized, original, "unchanged image should round-trip identical bytes");
    }

    #[test]
    fn resize_if_needed_avatar_caps_height() {
        let buf: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(800, 1200, |_x, _y| Rgb([0u8, 0, 0]));
        let mut bytes = Cursor::new(Vec::new());
        buf.write_to(&mut bytes, ImageFormat::Png).unwrap();
        let original = bytes.into_inner();

        let resized = resize_if_needed(&original, "png", "avatar").unwrap();
        let img = image::ImageReader::new(Cursor::new(&resized))
            .with_guessed_format().unwrap()
            .decode().unwrap();
        assert!(img.width() <= 512);
        assert!(img.height() <= 512);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    struct Pieces { role: String, hash: String, ext: String }

    fn regex_pieces(rel: &str) -> Pieces {
        // assets/{role}-{hash8}.{ext}
        let stripped = rel.strip_prefix("assets/").expect("assets/ prefix");
        let dot = stripped.rfind('.').expect("ext separator");
        let stem = &stripped[..dot];
        let ext = stripped[dot + 1..].to_string();
        let dash = stem.rfind('-').expect("role-hash separator");
        Pieces {
            role: stem[..dash].to_string(),
            hash: stem[dash + 1..].to_string(),
            ext,
        }
    }
}
