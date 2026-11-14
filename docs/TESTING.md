# Testing and release checks

## Automated checks

From the repository root:

```powershell
npm ci
npm audit
npm test
npm run build
```

`npm test` runs the Node unit tests for page ranges, sizing, filenames, file signatures, animated input rejection, cancellation and ZIP integrity. `npm run build` prepares local PDF.js assets, checks TypeScript and bundles the production site.

During local preview, the audit reported zero vulnerabilities. All 11 unit tests passed and the production build completed with Vite 7.3.8 and pdfjs-dist 6.2.108. These results describe that local dependency snapshot; rerun the checks after changing dependencies.

## Browser checks

Run `npm run fixtures` to generate synthetic image and PDF samples. The optional Playwright suite can be run with `npx playwright install chromium` followed by `npm run test:e2e`. It builds a production preview for browser assertions. The browser suite has not been verified in this environment.

Manual local preview confirmed image processing, output preview, output size and downloaded image, as well as PDF processing after updating PDF.js. These checks do not cover every format or browser.

Before publishing, verify drag and drop, PDF page count and ranges, output ZIP, language switching, mobile layout and the production build on the actual host. Inspect Network requests to check that filenames and file contents are not sent to a server. Use synthetic files for public tests. Review the files staged for Git to ensure no personal input or output is included.
