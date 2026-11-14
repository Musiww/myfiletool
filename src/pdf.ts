import { openPdf } from './pdf-runtime';
import { abort, encode, parsePages, safeName, extension, MAX_OUTPUT, type Options, type Output } from './core';
import type { Context } from './tools';
export async function convertPdf(file: File, name: string, o: Options, c: Context): Promise<Output[]> { abort(c.signal); const { task, api } = await openPdf(file); if (c.signal.aborted) {
    await task.destroy();
    abort(c.signal);
} const cancel = () => { void task.destroy(); }; c.signal.addEventListener('abort', cancel, { once: true }); try {
    const doc = await task.promise;
    const pages = parsePages(o.pages, doc.numPages);
    const result: Output[] = [];
    let total = 0;
    for (const num of pages) {
        abort(c.signal);
        const page = await doc.getPage(num);
        const viewport = page.getViewport({ scale: o.dpi / 72 });
        if (viewport.width * viewport.height > 24000000)
            throw Error('Page exceeds 24 million pixels. Reduce DPI.');
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
            c.progress('第 ' + num + ' / ' + doc.numPages + ' 页 · ' + canvas.width + ' × ' + canvas.height);
            const render = page.render({ canvas, viewport, background: '#ffffff', annotationMode: api.AnnotationMode.ENABLE });
            const stop = () => render.cancel();
            c.signal.addEventListener('abort', stop, { once: true });
            try {
                await render.promise;
            }
            finally {
                c.signal.removeEventListener('abort', stop);
            }
            const blob = await encode(canvas, o.format, o.quality);
            abort(c.signal);
            total += blob.size;
            if (total > MAX_OUTPUT)
                throw Error('Output exceeds 150 MB. Reduce page range or DPI.');
            result.push({ name: safeName(name) + '-p' + String(num).padStart(3, '0') + '.' + extension(o.format), blob, width: canvas.width, height: canvas.height, page: num });
        }
        finally {
            canvas.width = canvas.height = 0;
            page.cleanup();
        }
    }
    return result;
}
catch (e) {
    if (c.signal.aborted)
        throw new DOMException('Cancelled', 'AbortError');
    if (e instanceof Error && e.name === 'PasswordException')
        throw Error('Password-protected PDFs are unsupported.');
    throw e;
}
finally {
    c.signal.removeEventListener('abort', cancel);
    await task.destroy();
} }
