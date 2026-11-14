# Architecture
## Runtime
React 19 + TypeScript + Vite. No backend, database, account, upload API, analytics, or persistence.
A local File is validated → decoded/rendered → encoded to a Blob → previewed/downloaded.
The host serves static application assets only. PDF.js assets are copied from the installed package, never loaded from a CDN.

## Modules
| File | Responsibility |
| --- | --- |
| src/App.tsx | Accessible inputs, tool tabs, session reducer, queue orchestration, dialogs |
| src/core.ts | Signatures, animation and early pixel checks, page ranges, sizing, filenames, Canvas encoder |
| src/tools.ts | Tool registry and image processing; deferred PDF module |
| src/pdf-runtime.ts | Typed adapter to same-origin PDF.js, worker and resource paths, document inspection |
| src/pdf.ts | Sequential rendering, range selection, cancellation, memory caps |
| src/zip.ts | Standard uncompressed ZIP32 builder, UTF-8 filenames and CRC32 |
| src/styles.css / tokens.css | Responsive layout and green design tokens |
| scripts/pdf-assets.mjs | Required production preparation of PDF resources |
| scripts/core.test.mjs | Dependency-light Node tests |
| tests/app.spec.ts | Real browser checks; requires Playwright installation |

## State and lifecycle
Items carry File, kind, selected, display name, status, message and output Blobs.
Statuses: ready → running → done/error/cancelled. Parameter or name changes invalidate results.
Processing snapshots options and selected visible inputs. Later additions do not silently join that batch.
One task runs at a time. AbortController cooperates with PDF renderTask.cancel; non-interruptible Canvas encoding discards cancelled results.
A session epoch invalidates late results after clearing. Deleted item IDs prevent stale writes. Clearing also discards a pending ZIP result.
Object URLs are created by preview components and revoked on unmount. Download URLs are revoked after a short browser handoff period. ImageBitmaps, Canvas buffers and PDF documents are explicitly released.
Outputs reside in memory; no automatic recovery after refresh.

## Limits
20 files/session; 25 MiB/image; 50 MiB/PDF; 24 million decoded/output pixels; max 100 PDF pages per operation; 150 MiB combined retained outputs and ZIP input.
Some image headers can be validated before decoding. Unusual formats/headers still require browser decoding before the final pixel check. These are guardrails, not a guarantee against every malformed file or out-of-memory condition.
PDF pages render one at a time. Page previews are output thumbnails; the first version does not provide an interactive pre-rendered page picker.
Advanced PDF forms, XFA and color-managed print reproduction are not guaranteed.

## Extending
Add a converter with run(file, name, optionsSnapshot, {signal, progress}) returning Output[] and register it in tools. Keep UI-specific state separate from conversion, use the same validation, cancellation and output limits.
ZIP implementation differs from the proposed fflate dependency: stored entries avoid an additional runtime library and unnecessary recompression.
Native Node tests replace the suggested Vitest dependency for pure utilities. Browser tests still use Playwright.


## Interface languages and provenance
The React UI uses local copy in src/i18n.ts for English, Simplified Chinese and Traditional Chinese. English is the default. Language choice persists as a small localStorage preference, while the file queue remains in memory. The project-specific interface and queue flow were implemented from the myfiletool product brief. No third-party UI template or named application architecture was copied. Dependencies include React, Vite and Mozilla PDF.js; consult their respective licenses.
