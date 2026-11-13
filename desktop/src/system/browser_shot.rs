//! A picture of the browser window. The page cannot ask for one; the editor asks, and only the
//! open browser webview is read.

use tauri::{Runtime, WebviewWindow};

/// Which part of the open page a picture is of.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ShotKind {
    Visible,
    Full,
    Element,
}

/// A rectangle in the webview, in its own points.
#[derive(Clone, Copy, Debug)]
pub struct ShotRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn shot_kind(kind: &str) -> Result<ShotKind, String> {
    match kind {
        "visible" => Ok(ShotKind::Visible),
        "full" => Ok(ShotKind::Full),
        "element" => Ok(ShotKind::Element),
        _ => Err("The screenshot must be the view, the page, or an element.".to_owned()),
    }
}

/// The document size the window may grow to for a full-page picture. Larger pages are cut here.
pub fn capped_document(width: f64, height: f64) -> Result<(f64, f64), String> {
    if !width.is_finite() || !height.is_finite() || width <= 0.0 || height <= 0.0 {
        return Err("The page has no size".to_owned());
    }
    Ok((width.clamp(1.0, 2048.0), height.clamp(1.0, 4096.0)))
}

/// Base64 PNG of the open webview. `rect` is the element; none is the view itself.
pub async fn capture_png<R: Runtime>(
    window: &WebviewWindow<R>,
    rect: Option<ShotRect>,
) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        macos::capture(window, rect).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, rect);
        Err("A browser screenshot is only available on macOS.".to_owned())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::c_void;
    use std::ptr::NonNull;
    use std::sync::Mutex;

    use base64::Engine;
    use block2::RcBlock;
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};
    use objc2_foundation::{NSData, NSDictionary, NSError};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
    use tauri::{Runtime, WebviewWindow};
    use tokio::sync::oneshot;

    use super::ShotRect;

    /// The channel one snapshot answers on: bytes, or why the page could not be read.
    type ShotSender = oneshot::Sender<Result<Vec<u8>, String>>;
    type ShotSlot = Mutex<Option<ShotSender>>;

    pub async fn capture<R: Runtime>(
        window: &WebviewWindow<R>,
        rect: Option<ShotRect>,
    ) -> Result<String, String> {
        let (sender, receiver) = oneshot::channel();
        let slot = Mutex::new(Some(sender));
        window
            .with_webview(move |webview| schedule(webview.inner(), rect, slot))
            .map_err(|error| error.to_string())?;
        let bytes = receiver
            .await
            .map_err(|_| "The page did not answer".to_owned())??;
        Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
    }

    fn reply(slot: &ShotSlot, outcome: Result<Vec<u8>, String>) {
        if let Some(sender) = slot.lock().ok().and_then(|mut guard| guard.take()) {
            let _ = sender.send(outcome);
        }
    }

    /// Starts the snapshot and returns. The webview calls back later, on its own queue.
    fn schedule(view: *mut c_void, rect: Option<ShotRect>, slot: ShotSlot) {
        let Some(marker) = MainThreadMarker::new() else {
            reply(&slot, Err("The snapshot left the main thread".to_owned()));
            return;
        };
        let Some(view) = (unsafe { view.cast::<WKWebView>().as_ref() }) else {
            reply(&slot, Err("The webview is missing".to_owned()));
            return;
        };
        let config = unsafe { WKSnapshotConfiguration::new(marker) };
        if let Some(rect) = rect {
            unsafe {
                config.setRect(CGRect {
                    origin: CGPoint {
                        x: rect.x,
                        y: rect.y,
                    },
                    size: CGSize {
                        width: rect.width,
                        height: rect.height,
                    },
                })
            };
        }
        let block = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
            reply(&slot, read_image(image, error));
        });
        unsafe { view.takeSnapshotWithConfiguration_completionHandler(Some(&config), &block) };
    }

    fn read_image(image: *mut NSImage, error: *mut NSError) -> Result<Vec<u8>, String> {
        if image.is_null() {
            if error.is_null() {
                return Err("The page returned no picture".to_owned());
            }
            return Err(unsafe { &*error }.localizedDescription().to_string());
        }
        png_bytes(unsafe { &*image })
    }

    fn png_bytes(image: &NSImage) -> Result<Vec<u8>, String> {
        let reps = image.representations();
        for index in 0..reps.count() {
            let rep = reps.objectAtIndex(index);
            let Ok(bitmap) = rep.downcast::<NSBitmapImageRep>() else {
                continue;
            };
            let properties = NSDictionary::new();
            let Some(data) = (unsafe {
                bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties)
            }) else {
                continue;
            };
            let bytes = data_bytes(&data);
            if bytes.is_empty() {
                continue;
            }
            return Ok(bytes);
        }
        Err("The page returned no picture".to_owned())
    }

    fn data_bytes(data: &NSData) -> Vec<u8> {
        let length = data.length();
        let mut bytes = vec![0u8; length];
        if length > 0 {
            if let Some(pointer) = NonNull::new(bytes.as_mut_ptr().cast()) {
                unsafe { data.getBytes_length(pointer, length) };
            }
        }
        bytes
    }
}

#[cfg(test)]
mod tests {
    use super::{capped_document, shot_kind, ShotKind};

    #[test]
    fn a_picture_is_the_view_the_page_or_an_element() {
        assert_eq!(shot_kind("visible"), Ok(ShotKind::Visible));
        assert_eq!(shot_kind("full"), Ok(ShotKind::Full));
        assert_eq!(shot_kind("element"), Ok(ShotKind::Element));
        assert!(shot_kind("cdp").is_err());
    }

    #[test]
    fn a_full_page_is_capped() {
        assert_eq!(capped_document(800.0, 600.0), Ok((800.0, 600.0)));
        assert_eq!(capped_document(9000.0, 9000.0), Ok((2048.0, 4096.0)));
        assert!(capped_document(0.0, 10.0).is_err());
    }
}
