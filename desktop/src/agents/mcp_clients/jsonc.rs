//! JSON with comments and trailing commas, as the clients' config files allow, read into a
//! `serde_json::Value`. A key written twice in one object is refused, so the value read here is
//! the only one any reader of the file can see.

use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
use serde_json::{Map, Number, Value};

/// `text` without its comments and trailing commas; `None` when a comment or string is left open.
fn plain_json(text: &str) -> Option<String> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    while let Some(char) = chars.next() {
        match char {
            '"' => {
                out.push(char);
                loop {
                    let inner = chars.next()?;
                    out.push(inner);
                    if inner == '\\' {
                        out.push(chars.next()?);
                    } else if inner == '"' {
                        break;
                    }
                }
            }
            '/' if chars.peek() == Some(&'/') => {
                for inner in chars.by_ref() {
                    if inner == '\n' {
                        out.push('\n');
                        break;
                    }
                }
            }
            '/' if chars.peek() == Some(&'*') => {
                chars.next();
                let mut star = false;
                loop {
                    let inner = chars.next()?;
                    if star && inner == '/' {
                        break;
                    }
                    star = inner == '*';
                }
                out.push(' ');
            }
            _ => out.push(char),
        }
    }
    Some(without_trailing_commas(&out))
}

/// Drops each comma that only whitespace separates from a closing bracket; `text` holds no
/// comments.
fn without_trailing_commas(text: &str) -> String {
    let chars: Vec<char> = text.chars().collect();
    let mut out = String::with_capacity(text.len());
    let mut in_string = false;
    let mut index = 0;
    while index < chars.len() {
        let char = chars[index];
        if in_string {
            out.push(char);
            if char == '\\' {
                if let Some(next) = chars.get(index + 1) {
                    out.push(*next);
                }
                index += 1;
            } else if char == '"' {
                in_string = false;
            }
        } else if char == '"' {
            in_string = true;
            out.push(char);
        } else if char == ',' {
            let next = chars[index + 1..].iter().find(|next| !next.is_whitespace());
            if !matches!(next, Some('}') | Some(']')) {
                out.push(char);
            }
        } else {
            out.push(char);
        }
        index += 1;
    }
    out
}

/// A JSON value whose objects never repeat a key.
struct Strict(Value);

struct StrictVisitor;

impl<'de> Visitor<'de> for StrictVisitor {
    type Value = Strict;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("a JSON value")
    }

    fn visit_bool<E>(self, value: bool) -> Result<Strict, E> {
        Ok(Strict(Value::Bool(value)))
    }

    fn visit_i64<E>(self, value: i64) -> Result<Strict, E> {
        Ok(Strict(Value::Number(value.into())))
    }

    fn visit_u64<E>(self, value: u64) -> Result<Strict, E> {
        Ok(Strict(Value::Number(value.into())))
    }

    fn visit_f64<E: de::Error>(self, value: f64) -> Result<Strict, E> {
        Number::from_f64(value)
            .map(|number| Strict(Value::Number(number)))
            .ok_or_else(|| E::custom("not a finite number"))
    }

    fn visit_str<E>(self, value: &str) -> Result<Strict, E> {
        Ok(Strict(Value::String(value.to_owned())))
    }

    fn visit_string<E>(self, value: String) -> Result<Strict, E> {
        Ok(Strict(Value::String(value)))
    }

    fn visit_unit<E>(self) -> Result<Strict, E> {
        Ok(Strict(Value::Null))
    }

    fn visit_none<E>(self) -> Result<Strict, E> {
        Ok(Strict(Value::Null))
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Strict, A::Error> {
        let mut items = Vec::new();
        while let Some(Strict(item)) = seq.next_element()? {
            items.push(item);
        }
        Ok(Strict(Value::Array(items)))
    }

    fn visit_map<A: MapAccess<'de>>(self, mut access: A) -> Result<Strict, A::Error> {
        let mut map = Map::new();
        while let Some(key) = access.next_key::<String>()? {
            let Strict(value) = access.next_value()?;
            if map.contains_key(&key) {
                return Err(de::Error::custom(format!(
                    "the key {key:?} is written twice"
                )));
            }
            map.insert(key, value);
        }
        Ok(Strict(Value::Object(map)))
    }
}

impl<'de> Deserialize<'de> for Strict {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserializer.deserialize_any(StrictVisitor)
    }
}

/// The value of a JSON with comments document; `None` when it is not one, or repeats a key.
pub fn parse(text: &str) -> Option<Value> {
    let plain = plain_json(text)?;
    serde_json::from_str::<Strict>(&plain)
        .ok()
        .map(|Strict(value)| value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_comments_and_trailing_commas() {
        let text =
            "\u{feff}{\n  // a\n  \"a\": [1, 2,], /* b */\n  \"s\": \"// not /* a comment\",\n}\n";
        assert_eq!(
            parse(text),
            Some(json!({ "a": [1, 2], "s": "// not /* a comment" }))
        );
        assert_eq!(parse("{\"a\": \"x\\\",\"}"), Some(json!({ "a": "x\"," })));
    }

    #[test]
    fn refuses_a_repeated_key_and_text_left_open() {
        assert_eq!(parse("{\"a\": 1, \"a\": 2}"), None);
        assert_eq!(parse("{\"a\": {\"b\": 1, \"b\": 1}}"), None);
        assert_eq!(parse("{\"a\": 1} /* open"), None);
        assert_eq!(parse("{\"a\": \"open}"), None);
    }
}
