//! Network access the webview cannot do itself: proxied HTTP requests that skip CORS, and the
//! loopback ports that receive the ChatGPT and OpenRouter sign-in redirects.

pub mod http;
pub mod oauth;
