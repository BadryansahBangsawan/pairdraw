//! A picture of the browser window. The page cannot ask for one; the editor asks, and only the
//! open browser webview is read.

use std::time::Duration;

use serde::Deserialize;
use tauri::{Runtime, WebviewWindow};

use super::browser::{eval_text, until_deadline};

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

/// What one picture covers.
#[derive(Clone, Copy, Debug)]
pub enum ShotArea {
    /// A rectangle of the view: the viewport, or an element.
    Rect(ShotRect),
    /// The whole document. The webview, not the window, grows for the picture: a window cannot
    /// be taller than the screen, so a grown window still shows only the screen's height of the
    /// page.
    Page(PageSize),
}

/// A rectangle the page measured in CSS pixels, in the webview's points. Page zoom scales one
/// into the other.
pub fn in_points(rect: ShotRect, zoom: f64) -> ShotRect {
    ShotRect {
        x: rect.x * zoom,
        y: rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
    }
}

/// The open document as the webview lays it out, in points.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PageSize {
    pub width: f64,
    pub height: f64,
    /// The height of the viewport, `innerHeight`.
    pub viewport: f64,
}

/// The frame the webview grows to for a full-page picture, and the part of it the picture keeps.
/// The webview can lay out a viewport shorter than its frame (32 points in the browser window on
/// macOS 26), so the frame grows by that much more and the picture leaves it out.
pub fn grown_frame(shown_width: f64, shown_height: f64, page: PageSize) -> (f64, f64, ShotRect) {
    let width = page.width.max(shown_width);
    let unused = (shown_height - page.viewport).max(0.0);
    let kept = ShotRect {
        x: 0.0,
        y: 0.0,
        width,
        height: page.height,
    };
    (width, page.height + unused, kept)
}

/// The document size the webview may grow to for a full-page picture. Larger pages are cut here.
pub fn capped_document(width: f64, height: f64, viewport: f64) -> Result<PageSize, String> {
    if [width, height, viewport]
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0)
    {
        return Err("The page has no size".to_owned());
    }
    Ok(PageSize {
        width: width.clamp(1.0, 2048.0),
        height: height.clamp(1.0, 4096.0),
        viewport,
    })
}

/// The element rect a snapshot may ask WebKit for, in points: no taller than a full page
/// (4096), no wider than the view, and never off the view's top-left. A hostile page can report
/// an element of any magnitude; without this cap the snapshot configuration carries it straight
/// into the webview process.
pub fn capped_element(rect: ShotRect, view_width: f64) -> Result<ShotRect, String> {
    if !view_width.is_finite() || view_width <= 0.0 {
        return Err("The element has no size".to_owned());
    }
    if !rect.width.is_finite()
        || !rect.height.is_finite()
        || rect.width <= 0.0
        || rect.height <= 0.0
    {
        return Err("The element has no size".to_owned());
    }
    let x = if rect.x.is_finite() {
        rect.x.max(0.0)
    } else {
        0.0
    };
    let y = if rect.y.is_finite() {
        rect.y.max(0.0)
    } else {
        0.0
    };
    Ok(ShotRect {
        x,
        y,
        width: rect.width.clamp(1.0, view_width),
        height: rect.height.clamp(1.0, 4096.0),
    })
}

/// The document and the viewport that shows it, as the page measures them: in CSS pixels.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PageMetrics {
    width: f64,
    height: f64,
    view_width: f64,
    view_height: f64,
}

const PAGE_METRICS: &str = "JSON.stringify({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewWidth:innerWidth,viewHeight:innerHeight})";

/// The view or the whole page, in the webview's points. `zoom` is the page zoom. The webview's
/// frame can be taller than the viewport it lays out, so the view is the viewport, not the frame.
pub async fn page_area<R: Runtime>(
    window: &WebviewWindow<R>,
    kind: ShotKind,
    zoom: f64,
) -> Result<ShotArea, String> {
    let reported = until_deadline(
        eval_text(window, PAGE_METRICS),
        Duration::from_secs(10),
        "The page did not answer in time.",
    )
    .await?;
    let page: PageMetrics =
        serde_json::from_str(&reported).map_err(|_| "The page has no size".to_owned())?;
    if kind == ShotKind::Full {
        return Ok(ShotArea::Page(capped_document(
            page.width * zoom,
            page.height * zoom,
            page.view_height * zoom,
        )?));
    }
    Ok(ShotArea::Rect(in_points(
        ShotRect {
            x: 0.0,
            y: 0.0,
            width: page.view_width,
            height: page.view_height,
        },
        zoom,
    )))
}

/// Base64 PNG of the open webview.
pub async fn capture_png<R: Runtime>(
    window: &WebviewWindow<R>,
    area: ShotArea,
) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        macos::capture(window, area).await
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, area);
        Err("A browser screenshot is only available on macOS.".to_owned())
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::ffi::c_void;
    use std::ptr::NonNull;
    use std::sync::Mutex;
    use std::time::Duration;

    use base64::Engine;
    use block2::RcBlock;
    use objc2::{MainThreadMarker, Message};
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};
    use objc2_foundation::{NSData, NSDictionary, NSError};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
    use tauri::{Runtime, WebviewWindow};
    use tokio::sync::oneshot;

    use super::ShotArea;

    /// The channel one snapshot answers on: bytes, or why the page could not be read.
    type ShotSender = oneshot::Sender<Result<Vec<u8>, String>>;
    type ShotSlot = Mutex<Option<ShotSender>>;

    /// How long the editor waits for WebKit's snapshot callback. The completion handler restores
    /// the grown frame whenever it fires; this deadline only unblocks the editor if it never does.
    const SNAPSHOT_WAIT: Duration = Duration::from_secs(60);

    pub async fn capture<R: Runtime>(
        window: &WebviewWindow<R>,
        area: ShotArea,
    ) -> Result<String, String> {
        let (sender, receiver) = oneshot::channel();
        let slot = Mutex::new(Some(sender));
        window
            .with_webview(move |webview| schedule(webview.inner(), area, slot))
            .map_err(|error| error.to_string())?;
        let bytes = super::until_deadline(
            async {
                receiver
                    .await
                    .map_err(|_| "The page did not answer".to_owned())
            },
            SNAPSHOT_WAIT,
            "The snapshot timed out",
        )
        .await??;
        Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
    }

    fn reply(slot: &ShotSlot, outcome: Result<Vec<u8>, String>) {
        if let Some(sender) = slot.lock().ok().and_then(|mut guard| guard.take()) {
            let _ = sender.send(outcome);
        }
    }

    /// Starts the snapshot and returns. The webview calls back later, on its own queue. For a
    /// full page the webview grows inside its window until the snapshot is taken, then gets its
    /// frame back.
    fn schedule(view: *mut c_void, area: ShotArea, slot: ShotSlot) {
        let Some(marker) = MainThreadMarker::new() else {
            reply(&slot, Err("The snapshot left the main thread".to_owned()));
            return;
        };
        let Some(view) = (unsafe { view.cast::<WKWebView>().as_ref() }) else {
            reply(&slot, Err("The webview is missing".to_owned()));
            return;
        };
        let config = unsafe { WKSnapshotConfiguration::new(marker) };
        let shown = view.frame();
        let rect = match area {
            ShotArea::Rect(rect) => rect,
            ShotArea::Page(page) => {
                let (width, height, kept) =
                    super::grown_frame(shown.size.width, shown.size.height, page);
                let flipped = unsafe { view.superview() }.is_some_and(|parent| parent.isFlipped());
                let top = if flipped {
                    shown.origin.y
                } else {
                    shown.origin.y + shown.size.height - height
                };
                view.setFrame(CGRect {
                    origin: CGPoint {
                        x: shown.origin.x,
                        y: top,
                    },
                    size: CGSize { width, height },
                });
                kept
            }
        };
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
        let grown = matches!(area, ShotArea::Page(_)).then(|| view.retain());
        let block = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
            if let Some(view) = &grown {
                view.setFrame(shown);
            }
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

    /// A webview snapshot holds a snapshot representation, not a bitmap one, so the image is
    /// drawn into a bitmap at its full pixel size before it is encoded.
    fn png_bytes(image: &NSImage) -> Result<Vec<u8>, String> {
        let bitmap = image
            .TIFFRepresentation()
            .and_then(|tiff| NSBitmapImageRep::imageRepWithData(&tiff))
            .ok_or_else(|| "The page returned no picture".to_owned())?;
        let properties = NSDictionary::new();
        let data = unsafe {
            bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties)
        }
        .ok_or_else(|| "The picture could not be saved as PNG".to_owned())?;
        let bytes = data_bytes(&data);
        if bytes.is_empty() {
            return Err("The picture could not be saved as PNG".to_owned());
        }
        Ok(bytes)
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
    use super::{
        capped_document, capped_element, grown_frame, in_points, shot_kind, PageSize, ShotKind,
        ShotRect,
    };

    #[test]
    fn a_picture_is_the_view_the_page_or_an_element() {
        assert_eq!(shot_kind("visible"), Ok(ShotKind::Visible));
        assert_eq!(shot_kind("full"), Ok(ShotKind::Full));
        assert_eq!(shot_kind("element"), Ok(ShotKind::Element));
        assert!(shot_kind("cdp").is_err());
    }

    #[test]
    fn a_full_page_is_capped() {
        let page = |width, height| PageSize {
            width,
            height,
            viewport: 700.0,
        };
        assert_eq!(capped_document(800.0, 600.0, 700.0), Ok(page(800.0, 600.0)));
        assert_eq!(
            capped_document(9000.0, 9000.0, 700.0),
            Ok(page(2048.0, 4096.0))
        );
        assert!(capped_document(0.0, 10.0, 700.0).is_err());
        assert!(capped_document(10.0, 10.0, f64::NAN).is_err());
    }

    #[test]
    fn an_element_rect_is_capped_to_the_full_page_box_and_the_view_width() {
        let rect = |x, y, width, height| ShotRect {
            x,
            y,
            width,
            height,
        };
        // A hostile page can report an element of any magnitude; the snapshot asks WebKit for
        // this rect, so it is bounded like the full page: 4096 points tall, the view wide.
        let huge = capped_element(rect(10.0, 20.0, 1e9, 1e9), 1024.0).expect("capped");
        assert_eq!((huge.width, huge.height), (1024.0, 4096.0));
        assert_eq!((huge.x, huge.y), (10.0, 20.0));
        // A small element keeps its size and place.
        let small = capped_element(rect(5.0, 6.0, 300.0, 150.0), 1024.0).expect("capped");
        assert_eq!(
            (small.x, small.y, small.width, small.height),
            (5.0, 6.0, 300.0, 150.0)
        );
        // Negative origins clamp to the view; a non-finite or empty rect is refused.
        let negative = capped_element(rect(-50.0, -50.0, 100.0, 100.0), 1024.0).expect("capped");
        assert_eq!((negative.x, negative.y), (0.0, 0.0));
        assert!(capped_element(rect(0.0, 0.0, 0.0, 10.0), 1024.0).is_err());
        assert!(capped_element(rect(0.0, 0.0, f64::NAN, 10.0), 1024.0).is_err());
        assert!(capped_element(rect(0.0, 0.0, 10.0, 10.0), 0.0).is_err());
    }

    #[test]
    fn page_zoom_turns_css_pixels_into_points() {
        let rect = ShotRect {
            x: 10.0,
            y: 20.0,
            width: 300.0,
            height: 150.0,
        };
        let zoomed = in_points(rect, 1.5);
        assert_eq!(
            (zoomed.x, zoomed.y, zoomed.width, zoomed.height),
            (15.0, 30.0, 450.0, 225.0)
        );
    }

    #[test]
    fn the_grown_frame_holds_the_whole_page_in_its_viewport() {
        // A 1024x768 view that lays out a 736-point viewport shows a 3000-point page whole only
        // when it is 3032 points tall; the picture keeps the page's 3000.
        let page = PageSize {
            width: 1024.0,
            height: 3000.0,
            viewport: 736.0,
        };
        let (width, height, kept) = grown_frame(1024.0, 768.0, page);
        assert_eq!((width, height), (1024.0, 3032.0));
        assert_eq!(
            (kept.x, kept.y, kept.width, kept.height),
            (0.0, 0.0, 1024.0, 3000.0)
        );

        // A page wider than the view widens it; a viewport the full frame tall adds nothing.
        let wide = PageSize {
            width: 1500.0,
            height: 900.0,
            viewport: 768.0,
        };
        let (width, height, kept) = grown_frame(1024.0, 768.0, wide);
        assert_eq!((width, height), (1500.0, 900.0));
        assert_eq!((kept.width, kept.height), (1500.0, 900.0));
    }
}
