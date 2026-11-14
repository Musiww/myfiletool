# Privacy and threat model
The application code does not upload inputs, output Blobs, names, passwords or processing parameters. There are no analytics SDKs, third-party fonts, accounts, databases or persistent file history.
Opening the page and loading PDF modules/fonts/WASM requests same-origin static resources. Hosting providers can still observe ordinary page access, IP addresses and asset requests.
User content is not placed in URLs or rendered as HTML. Error messages are shown locally. Browser/PDF.js diagnostic messages can appear in local developer tools; these are not sent to a reporting service.
Images are re-encoded from pixels, without intentionally copying EXIF/GPS. Visible personal information remains in the image. Metadata stripping and orientation require real-device fixture verification; no universal anonymization guarantee.
PDF links/scripts/attachments are not executed by the app. It uses the rendering API, not the interactive viewer; XFA and dynamic evaluation are disabled. Common visible annotations render, but complex forms/annotations should be checked manually.
No localStorage, sessionStorage, IndexedDB or Service Worker is used for file storage. Browser/OS temporary files, downloaded files and device synchronization are outside this app's control.
Do not put real sensitive files in this source folder. Use only synthetic fixtures in Git.
Production CSP permits same-origin scripts/resources, Blob images/workers/fonts and WASM compilation. It disallows external services, objects and form submission. Development additionally permits Vite's inline refresh preamble and loopback websocket. Production removes that development websocket allowance.
Meta CSP cannot implement every HTTP security header; use hosting with configurable response headers if you need frame-ancestors and other header-only controls.
Open source/self-hosting does not eliminate trust in dependencies, OS, extensions and deployment accounts. Dependencies need periodic updates and review.
The network assertions in tests/app.spec.ts are written but have not run in this environment. Do not present the privacy design as a completed independent security audit.


## Language preference
The selected language code (en, zh-CN or zh-TW) is stored in localStorage. File contents, filenames and output files are not stored there.
