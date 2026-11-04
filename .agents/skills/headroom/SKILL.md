---
name: headroom
description: Token and context compression skill for large outputs, logs, crawls, and JSON payloads. Use when scraping websites, processing large files, or passing data to LLMs.
---

# Token & Context Compression (`headroom`)

## Core Rules for Context Efficiency
1. **Pre-filter & Strip Boilerplate**: When scraping web pages or processing raw markdown/HTML crawls, immediately strip out navigation bars, footers, cookie banners, script tags, and SVG cruft before passing content into LLMs or storage.
2. **Head / Tail / Delta Strategy**: For massive log files, JSON arrays, or command output:
   - Keep the head (first N lines/items) and tail (last N lines/items).
   - Summarize or filter the delta (middle section) or extract matching query filters.
3. **Structured Payload Truncation**: When passing large JSON datasets (e.g., song databases or search results), strip redundant metadata fields, normalize whitespace, and only transmit necessary fields.
4. **Token Budget Awareness**: Always estimate token impact of large multi-file dumps or recursive directory reads. Favor selective chunking and grep searches over full file inclusions.
