// A small typed boundary around the self-hosted PDF.js display API.
export type Viewport = {
    width: number;
    height: number;
};
type RenderTask = {
    promise: Promise<void>;
    cancel: () => void;
};
type Page = {
    getViewport: (options: {
        scale: number;
    }) => Viewport;
    render: (options: {
        canvas: HTMLCanvasElement;
        viewport: Viewport;
        background: string;
        annotationMode: number;
    }) => RenderTask;
    cleanup: () => void;
};
type Doc = {
    numPages: number;
    getPage: (n: number) => Promise<Page>;
};
export type LoadingTask = {
    promise: Promise<Doc>;
    destroy: () => Promise<void>;
};
type PdfApi = {
    GlobalWorkerOptions: {
        workerSrc: string;
    };
    AnnotationMode: {
        ENABLE: number;
    };
    getDocument: (options: Record<string, unknown>) => LoadingTask;
};
export async function openPdf(file: File): Promise<{
    task: LoadingTask;
    api: PdfApi;
}> {
    // Import the public module by full URL so Vite does not add ?import in dev.
    const base = new URL(import.meta.env.BASE_URL + 'pdf-assets/', document.baseURI).href;
    let api: PdfApi;
    try {
        api = await import(/* @vite-ignore */ base + 'pdf.mjs') as PdfApi;
    }
    catch {
        throw Error('PDF engine missing. Install dependencies and restart.');
    }
    api.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
    const task = api.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: base + 'cmaps/', cMapPacked: true, standardFontDataUrl: base + 'standard_fonts/', wasmUrl: base + 'wasm/', iccUrl: base + 'iccs/', isEvalSupported: false, enableXfa: false });
    return { task, api };
}
export async function pdfInfo(file: File) { const { task } = await openPdf(file); try {
    const doc = await task.promise;
    return doc.numPages;
}
catch (e) {
    if (e instanceof Error && e.name === 'PasswordException')
        throw Error('Password-protected PDFs are unsupported.');
    throw Error('Could not open this PDF. Check whether the file is damaged.');
}
finally {
    await task.destroy();
} }
