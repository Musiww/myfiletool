# myfiletool · Gentle tools for everyday files

**English** · [简体中文](README.zh-CN.md)

myfiletool (轻轻工具) is a small, browser-based workspace for images and PDFs. I built it because I sometimes need to process documents containing personal information, and I do not feel comfortable uploading them to a file-conversion website whose handling of my files I cannot verify. I wanted a tool I could inspect, run, and host myself.

Files are processed in your browser. The app has no file-upload API, account system, or database for your files. Refreshing the page clears the current queue and results. It stores only your language preference in the browser. Your hosting provider may still log ordinary site visits, and downloaded files are managed by your browser and device. See [Privacy and security](docs/PRIVACY.md) for the exact boundaries.

## What it does

- Compress and resize JPEG, PNG, and static WebP images; export as JPEG, PNG, or WebP. PNG is lossless, so it has no quality slider.
- Render PDF pages as separate images. Leave the page range blank for all pages, or select a page (`3`), range (`3-5`), or list (`1,3-5`).
- Drag and drop files, preview originals and results, rename output bases, filter and select the queue, download one result or a ZIP of selected results, and clear the session.
- Switch the interface among English, Simplified Chinese, and Traditional Chinese.

The first release is intentionally small. I plan to add more useful local file tools over time. Ideas and improvements are welcome. If you like the project, you can fork it and deploy your own copy on your own website.

## Run locally

Use Node.js 24 (see [.nvmrc](.nvmrc)). From the repository root:

```powershell
npm ci
npm run dev
```

Open the local URL shown in the terminal. For a production build and local preview:

```powershell
npm run build
npm run preview
```

## Checks

```powershell
npm test
npm run typecheck
npm run build
```

Browser tests use synthetic fixtures. To run them, generate the fixtures, install Playwright Chromium, and run `npm run test:e2e`. Check [testing notes](docs/TESTING.md) for scope and limitations.

```powershell
npm run fixtures
npx playwright install chromium
npm run test:e2e
```

## Deploy your own copy

The app is static and can be deployed to Cloudflare Pages. Connect your fork or repository through Cloudflare Pages Git integration. Use `main` as the production branch, `npm run build` as the build command, and `dist` as the output directory. The repository's [.nvmrc](.nvmrc) specifies Node.js 24. The default Vite base path `/` works for a dedicated domain or subdomain. Add your domain in the Pages project's Custom domains settings after the first successful build. See the [deployment guide](docs/DEPLOYMENT.md) for detailed steps and a GitHub Pages alternative.

If you fork this publicly, check the repository for personal files before pushing. Do not commit real documents or processed outputs. The [`.gitignore`](.gitignore) excludes build artifacts, dependencies, and local input/output folders.

## How it is built

React, TypeScript, and Vite provide the interface. Browser Canvas handles images; self-hosted Mozilla PDF.js renders PDFs. A local ZIP writer packages results. The app was designed for this project from its product brief, without copying a named product's interface or template. This project's code is offered under the [MIT License](LICENSE); third-party dependencies retain their own licenses. The deployed PDF.js assets include its Apache 2.0 license. See [architecture](docs/ARCHITECTURE.md), [original design](DESIGN.md), and [roadmap](docs/ROADMAP.md).
