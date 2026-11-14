import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
    plugins: [react(), {
        name: 'myfiletool-csp',
        transformIndexHtml(html) {
            // Vite React refresh uses an inline preamble only in development.
            return command === 'serve'
                ? html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
                : html.replace(' ws://127.0.0.1:5173', '');
        },
    }],
    define: { __PDF_READY__: JSON.stringify(existsSync('node_modules/pdfjs-dist/build/pdf.mjs')) },
    base: process.env.VITE_BASE || '/',
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
}));
