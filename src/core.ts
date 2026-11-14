export type Kind = 'image' | 'pdf';
export type Status = 'ready' | 'running' | 'done' | 'error' | 'cancelled';
export type Options = {
    format: 'image/jpeg' | 'image/png' | 'image/webp';
    quality: number;
    maxWidth: number;
    maxHeight: number;
    dpi: number;
    pages: string;
};
export type Output = {
    name: string;
    blob: Blob;
    width: number;
    height: number;
    page?: number;
};
export const defaults: Options = { format: 'image/jpeg', quality: .82, maxWidth: 2400, maxHeight: 2400, dpi: 150, pages: '' };
export const MAX_OUTPUT = 150 * 1024 * 1024;
export function parsePages(text: string, count: number): number[] {
    if (!text.trim()) {
        if (count > 100)
            throw Error('Select at most 100 PDF pages.');
        return Array.from({ length: count }, (_, i) => i + 1);
    }
    const set = new Set<number>();
    for (const part of text.split(',')) {
        const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
        if (!m)
            throw Error('Use a page range such as 1,3-5.');
        const a = Number(m[1]), b = Number(m[2] || m[1]);
        if (a < 1 || b < a || b > count)
            throw Error('Page range is outside the PDF or reversed.');
        if (b - a >= 100)
            throw Error('Select at most 100 PDF pages.');
        for (let i = a; i <= b; i++)
            set.add(i);
    }
    if (set.size > 100)
        throw Error('Select at most 100 PDF pages.');
    return [...set].sort((a, b) => a - b);
}
export function fit(w: number, h: number, mw: number, mh: number) { if (![w, h, mw, mh].every(v => Number.isFinite(v) && v > 0))
    throw Error('Width and height must be above zero.'); const scale = Math.min(1, mw / w, mh / h); return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }; }
export function safeName(name: string) { return name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^\.+|[. ]+$/g, '').slice(0, 100) || 'file'; }
export const extension = (mime: string) => mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
export function uniqueNames(names: string[]) { const used = new Set<string>(); return names.map(name => { const dot = name.lastIndexOf('.'); const stem = name.slice(0, dot), ext = name.slice(dot); let candidate = name, n = 2; while (used.has(candidate.toLowerCase()))
    candidate = stem + '-' + n++ + ext; used.add(candidate.toLowerCase()); return candidate; }); }
export function bytes(n: number) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
export function abort(signal: AbortSignal) { if (signal.aborted)
    throw new DOMException('Cancelled', 'AbortError'); }
export async function identify(file: File): Promise<Kind> { if (!file.size)
    throw Error('Empty files cannot be processed.'); const b = new Uint8Array(await file.slice(0, 32).arrayBuffer()), s = new TextDecoder('latin1').decode(b); if (s.startsWith('%PDF-')) {
    if (file.size > 50 * 1048576)
        throw Error('PDF limit is 50 MB.');
    return 'pdf';
} if (file.size > 25 * 1048576)
    throw Error('Image limit is 25 MB.'); if (b[0] === 255 && b[1] === 216 && b[2] === 255)
    return 'image'; if (b[0] === 137 && s.slice(1, 4) === 'PNG')
    return 'image'; if (s.startsWith('RIFF') && s.slice(8, 12) === 'WEBP')
    return 'image'; throw Error('Supported files: JPEG, PNG, static WebP and PDF.'); }
export async function rejectAnimation(file: File) { const b = new Uint8Array(await file.arrayBuffer()), v = new DataView(b.buffer); const ascii = (i: number) => String.fromCharCode(...b.slice(i, i + 4)); if (ascii(0) === 'RIFF') {
    for (let p = 12; p + 8 <= b.length;) {
        const t = ascii(p), n = v.getUint32(p + 4, true);
        if (t === 'ANIM' || t === 'ANMF')
            throw Error('Animated WebP is unsupported.');
        p += 8 + n + (n % 2);
    }
}
else if (b[0] === 137) {
    for (let p = 8; p + 12 <= b.length;) {
        const n = v.getUint32(p);
        if (ascii(p + 4) === 'acTL')
            throw Error('Animated PNG is unsupported.');
        p += 12 + n;
    }
} }
export function encode(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> { return new Promise((resolve, reject) => canvas.toBlob(b => b && b.type === mime ? resolve(b) : reject(Error('浏览器不支持此输出格式，请选择 PNG。')), mime, quality)); }
export async function checkPixelHeader(file: File) { const b = new Uint8Array(await file.slice(0, 262144).arrayBuffer()), v = new DataView(b.buffer); let w = 0, h = 0; if (b[0] === 137 && b.length >= 24) {
    w = v.getUint32(16);
    h = v.getUint32(20);
}
else if (b[0] === 255 && b[1] === 216) {
    let p = 2;
    while (p + 8 < b.length) {
        if (b[p] !== 255)
            break;
        const marker = b[p + 1];
        if (marker === 0xda || marker === 0xd9)
            break;
        const length = v.getUint16(p + 2);
        if (length < 2)
            break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
            h = v.getUint16(p + 5);
            w = v.getUint16(p + 7);
            break;
        }
        p += 2 + length;
    }
}
else if (b.length >= 30 && String.fromCharCode(...b.slice(12, 16)) === 'VP8X') {
    w = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
    h = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
} if (w * h > 24000000)
    throw Error('Image exceeds 24 million pixels.'); }
