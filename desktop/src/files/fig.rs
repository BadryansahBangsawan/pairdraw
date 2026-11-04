use serde::Deserialize;
use std::io::{Cursor, Write};

#[derive(Deserialize)]
pub struct ImageEntry {
    name: String,
    data: Vec<u8>,
}

/// The zstd level Figma itself saves with.
const DEFAULT_COMPRESSION_LEVEL: i32 = 3;

/// The archive a save writes: the encoded document, its thumbnail and `meta.json`, the images it
/// holds, and whether it is a FigJam board, which `.jam` marks only in the canvas header.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FigFile {
    schema_deflated: Vec<u8>,
    kiwi_data: Vec<u8>,
    thumbnail_png: Vec<u8>,
    meta_json: String,
    images: Option<Vec<ImageEntry>>,
    fonts: Option<Vec<ImageEntry>>,
    fonts_json: Option<String>,
    fig_kiwi_version: Option<u32>,
    compression_level: Option<i32>,
    #[serde(default)]
    board: bool,
}

/// Writes the `.fig` or `.jam` archive on a blocking thread: high zstd levels take seconds on
/// large documents, which would otherwise stall the window.
#[tauri::command]
pub async fn build_fig_file(file: FigFile) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || write_fig_file(file))
        .await
        .map_err(|e| e.to_string())?
}

fn write_fig_file(file: FigFile) -> Result<tauri::ipc::Response, String> {
    let FigFile {
        schema_deflated,
        kiwi_data,
        thumbnail_png,
        meta_json,
        images,
        fonts,
        fonts_json,
        fig_kiwi_version,
        compression_level,
        board,
    } = file;
    let levels = zstd::compression_level_range();
    let level = compression_level
        .unwrap_or(DEFAULT_COMPRESSION_LEVEL)
        .clamp(*levels.start(), *levels.end());
    // Figma rejects zstd frames that do not declare their decompressed size.
    let mut encoder = zstd::Encoder::new(Vec::new(), level).map_err(|e| e.to_string())?;
    encoder
        .include_contentsize(true)
        .map_err(|e| e.to_string())?;
    encoder
        .set_pledged_src_size(Some(kiwi_data.len() as u64))
        .map_err(|e| e.to_string())?;
    encoder.write_all(&kiwi_data).map_err(|e| e.to_string())?;
    let zstd_data = encoder.finish().map_err(|e| e.to_string())?;

    let version: u32 = fig_kiwi_version.unwrap_or(101);
    let fig_kiwi_len = 8 + 4 + 4 + schema_deflated.len() + 4 + zstd_data.len();
    let mut fig_kiwi = Vec::with_capacity(fig_kiwi_len);
    // A FigJam board's `.jam` differs from a design's `.fig` only in this header.
    fig_kiwi.extend_from_slice(if board { b"fig-jam." } else { b"fig-kiwi" });
    fig_kiwi.extend_from_slice(&version.to_le_bytes());
    fig_kiwi.extend_from_slice(&(schema_deflated.len() as u32).to_le_bytes());
    fig_kiwi.extend_from_slice(&schema_deflated);
    fig_kiwi.extend_from_slice(&(zstd_data.len() as u32).to_le_bytes());
    fig_kiwi.extend_from_slice(&zstd_data);

    let buf = Cursor::new(Vec::new());
    let mut zip = zip::ZipWriter::new(buf);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    zip.start_file("canvas.fig", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&fig_kiwi).map_err(|e| e.to_string())?;

    zip.start_file("thumbnail.png", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(&thumbnail_png).map_err(|e| e.to_string())?;

    zip.start_file("meta.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(meta_json.as_bytes())
        .map_err(|e| e.to_string())?;

    if let Some(image_entries) = images {
        for entry in image_entries {
            zip.start_file(&entry.name, options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&entry.data).map_err(|e| e.to_string())?;
        }
    }

    if let Some(font_entries) = fonts {
        for entry in font_entries {
            zip.start_file(&entry.name, options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&entry.data).map_err(|e| e.to_string())?;
        }
    }

    if let Some(manifest) = fonts_json {
        zip.start_file("fonts.json", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(manifest.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let result = zip.finish().map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(result.into_inner()))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The payload `build_fig_file` receives from `packages/core/src/io/formats/fig/export/
    /// index.ts`, which sends camelCase keys. Renaming the struct fields without renaming the
    /// wire keys silently failed every save, so pin the exact shape here.
    fn payload(fonts: bool) -> serde_json::Value {
        serde_json::json!({
            "schemaDeflated": [1, 2, 3],
            "kiwiData": [4, 5, 6],
            "thumbnailPng": [7, 8, 9],
            "metaJson": "{}",
            "images": [{ "name": "a.png", "data": [1] }],
            "fonts": if fonts { serde_json::json!([{ "name": "b.ttf", "data": [2] }]) } else { serde_json::Value::Null },
            "fontsJson": if fonts { serde_json::json!("{\"font\":1}") } else { serde_json::Value::Null },
            "figKiwiVersion": 101,
            "compressionLevel": 3,
            "board": true
        })
    }

    #[test]
    fn reads_the_camel_case_payload_with_fonts() {
        let file: FigFile = serde_json::from_value(payload(true)).unwrap();
        assert_eq!(file.schema_deflated, vec![1u8, 2, 3]);
        assert_eq!(file.kiwi_data, vec![4u8, 5, 6]);
        assert_eq!(file.thumbnail_png, vec![7u8, 8, 9]);
        assert_eq!(file.meta_json, "{}");
        assert_eq!(file.fig_kiwi_version, Some(101));
        assert_eq!(file.compression_level, Some(3));
        assert!(file.board);
        assert_eq!(file.images.unwrap().len(), 1);
        assert_eq!(file.fonts.unwrap().len(), 1);
        assert_eq!(file.fonts_json.as_deref(), Some("{\"font\":1}"));
    }

    #[test]
    fn reads_the_camel_case_payload_without_fonts() {
        let file: FigFile = serde_json::from_value(payload(false)).unwrap();
        assert!(file.fonts.is_none());
        assert!(file.fonts_json.is_none());
    }

    #[test]
    fn defaults_the_omitted_board_flag_to_a_design() {
        let mut json = payload(false);
        json.as_object_mut().unwrap().remove("board");
        let file: FigFile = serde_json::from_value(json).unwrap();
        assert!(!file.board);
    }

    #[test]
    fn rejects_snake_case_keys() {
        let json = serde_json::json!({
            "schema_deflated": [1],
            "kiwi_data": [],
            "thumbnail_png": [],
            "meta_json": "{}"
        });
        assert!(serde_json::from_value::<FigFile>(json).is_err());
    }
}
