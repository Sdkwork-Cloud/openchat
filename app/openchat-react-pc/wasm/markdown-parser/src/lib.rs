mod utils;

use wasm_bindgen::prelude::*;
use pulldown_cmark::{Parser, Options, html};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Markdown parsing result
#[wasm_bindgen]
pub struct ParseResult {
    html: String,
    success: bool,
    error: String,
}

#[wasm_bindgen]
impl ParseResult {
    #[wasm_bindgen(getter)]
    pub fn html(&self) -> String {
        self.html.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool {
        self.success
    }

    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String {
        self.error.clone()
    }
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn start() {
    utils::set_panic_hook();
}

/// Parse markdown to HTML
/// 
/// # Arguments
/// * `markdown` - The markdown string to parse
/// 
/// # Returns
/// * `ParseResult` - The parsing result containing HTML or error
#[wasm_bindgen]
pub fn parse_markdown(markdown: &str) -> ParseResult {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    
    match html::push_html(&mut html_output, parser) {
        Ok(_) => ParseResult {
            html: html_output,
            success: true,
            error: String::new(),
        },
        Err(e) => ParseResult {
            html: String::new(),
            success: false,
            error: format!("Parse error: {:?}", e),
        },
    }
}

/// Parse markdown with custom options
/// 
/// # Arguments
/// * `markdown` - The markdown string to parse
/// * `enable_tables` - Enable GitHub-style tables
/// * `enable_strikethrough` - Enable strikethrough
/// * `enable_tasklists` - Enable task lists
/// 
/// # Returns
/// * `ParseResult` - The parsing result
#[wasm_bindgen]
pub fn parse_markdown_with_options(
    markdown: &str,
    enable_tables: bool,
    enable_strikethrough: bool,
    enable_tasklists: bool,
) -> ParseResult {
    let mut options = Options::empty();
    
    if enable_tables {
        options.insert(Options::ENABLE_TABLES);
    }
    if enable_strikethrough {
        options.insert(Options::ENABLE_STRIKETHROUGH);
    }
    if enable_tasklists {
        options.insert(Options::ENABLE_TASKLISTS);
    }

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    
    match html::push_html(&mut html_output, parser) {
        Ok(_) => ParseResult {
            html: html_output,
            success: true,
            error: String::new(),
        },
        Err(e) => ParseResult {
            html: String::new(),
            success: false,
            error: format!("Parse error: {:?}", e),
        },
    }
}

/// Batch parse multiple markdown strings
/// 
/// # Arguments
/// * `markdowns` - Array of markdown strings
/// 
/// # Returns
/// * Array of ParseResults
#[wasm_bindgen]
pub fn batch_parse_markdown(markdowns: Vec<String>) -> Result<JsValue, JsValue> {
    let results: Vec<ParseResult> = markdowns
        .iter()
        .map(|md| parse_markdown(md))
        .collect();
    
    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {:?}", e)))
}

/// Get word count from markdown
/// 
/// # Arguments
/// * `markdown` - The markdown string
/// 
/// # Returns
/// * Word count
#[wasm_bindgen]
pub fn get_word_count(markdown: &str) -> usize {
    markdown.split_whitespace().count()
}

/// Get reading time estimation
/// 
/// # Arguments
/// * `markdown` - The markdown string
/// * `words_per_minute` - Reading speed (default: 200)
/// 
/// # Returns
/// * Reading time in minutes
#[wasm_bindgen]
pub fn get_reading_time(markdown: &str, words_per_minute: Option<usize>) -> f64 {
    let wpm = words_per_minute.unwrap_or(200);
    let word_count = get_word_count(markdown);
    word_count as f64 / wpm as f64
}

/// Extract headings from markdown
/// 
/// # Arguments
/// * `markdown` - The markdown string
/// 
/// # Returns
/// * Array of headings (level, text)
#[wasm_bindgen]
pub fn extract_headings(markdown: &str) -> Result<JsValue, JsValue> {
    let parser = Parser::new(markdown);
    let mut headings: Vec<(u8, String)> = Vec::new();
    let mut current_heading: Option<(u8, String)> = None;

    for event in parser {
        match event {
            pulldown_cmark::Event::Start(pulldown_cmark::Tag::Heading(level, _, _)) => {
                current_heading = Some((level as u8, String::new()));
            }
            pulldown_cmark::Event::Text(text) => {
                if let Some((level, ref mut content)) = current_heading {
                    content.push_str(&text);
                }
            }
            pulldown_cmark::Event::End(pulldown_cmark::Tag::Heading(_, _, _)) => {
                if let Some(heading) = current_heading.take() {
                    headings.push(heading);
                }
            }
            _ => {}
        }
    }

    serde_wasm_bindgen::to_value(&headings)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {:?}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markdown() {
        let result = parse_markdown("# Hello\n\nWorld");
        assert!(result.success);
        assert!(result.html.contains("<h1>Hello</h1>"));
        assert!(result.html.contains("<p>World</p>"));
    }

    #[test]
    fn test_word_count() {
        assert_eq!(get_word_count("Hello world"), 2);
        assert_eq!(get_word_count(""), 0);
    }

    #[test]
    fn test_reading_time() {
        let text = "word ".repeat(200);
        let time = get_reading_time(&text, Some(200));
        assert!((time - 1.0).abs() < 0.01);
    }
}
