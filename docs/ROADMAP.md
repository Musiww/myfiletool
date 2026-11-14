# Roadmap and scope

## Current release

The browser-based release handles JPEG, PNG and static WebP images, PDF pages rendered as images, a session file queue, output preview, individual downloads and ZIP export. English, Simplified Chinese and Traditional Chinese share one interface. English is the default.

The application has no file-processing backend or file database. Processing and ZIP creation happen in the browser. Language preference is stored locally; files and results remain in the page session.

## Design choices

- ZIP32 stored entries are used because image files are already compressed.
- Pure logic uses Node's built-in test runner.
- PDF module, worker and supporting assets are served from the same origin.
- Shared settings apply to selected files in the active tool; changing them invalidates affected results.
- Removing an item being processed cancels its current work.

## Possible additions

1. Crop and rotate images; optional target file size with a clear failure state.
2. Images to PDF and PDF split or merge in a separate writing module.
3. Offline readiness and app shell caching without caching user documents.
4. HEIC after evaluating decoder size, licensing and memory use.
5. Local OCR and independently validated redaction.

New features should preserve file validation, cancellation, resource limits and the local download flow.
