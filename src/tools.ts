import { abort, encode, extension, fit, parsePages, rejectAnimation, safeName, MAX_OUTPUT, type Options, type Output, type Kind } from './core';
export type Context = {
    signal: AbortSignal;
    progress: (s: string) => void;
};
async function image(file: File, name: string, o: Options, c: Context): Promise<Output[]> { await rejectAnimation(file); abort(c.signal); const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); const canvas = document.createElement('canvas'); try {
    abort(c.signal);
    if (bitmap.width * bitmap.height > 24000000)
        throw Error('Image exceeds 24 million pixels.');
    const size = fit(bitmap.width, bitmap.height, o.maxWidth, o.maxHeight);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d')!;
    if (o.format === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    c.progress('正在编码图片');
    const blob = await encode(canvas, o.format, o.quality);
    abort(c.signal);
    return [{ name: safeName(name) + '-optimized.' + extension(o.format), blob, ...size }];
}
finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
} }
async function pdf(file: File, name: string, o: Options, c: Context): Promise<Output[]> { const { convertPdf } = await import('./pdf'); return convertPdf(file, name, o, c); }
export const tools: Record<Kind, {
    label: string;
    run: typeof image;
}> = { image: { label: '图片处理', run: image }, pdf: { label: 'PDF 转图片', run: pdf } };
export { makeZip } from './zip';
