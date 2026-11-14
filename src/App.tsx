import { useEffect, useReducer, useRef, useState } from 'react';
import { bytes, defaults, identify, rejectAnimation, checkPixelHeader, MAX_OUTPUT, type Kind, type Options, type Output, type Status } from './core';
import { makeZip, tools } from './tools';
import { copy, languages, type Language } from './i18n';

type Item = { id: string; file: File; name: string; kind: Kind; status: Status; selected: boolean; outputs: Output[]; message: string; downloaded: boolean; pageCount?: number };
type Action = { type: 'add'; items: Item[] } | { type: 'patch'; id: string; patch: Partial<Item> } | { type: 'remove'; id: string } | { type: 'clear' } | { type: 'stale'; kind: Kind };
function reducer(state: Item[], action: Action): Item[] {
  switch (action.type) {
    case 'add': return [...state, ...action.items];
    case 'patch': return state.map(item => item.id === action.id ? { ...item, ...action.patch } : item);
    case 'remove': return state.filter(item => item.id !== action.id);
    case 'clear': return [];
    case 'stale': return state.map(item => item.kind === action.kind && item.status === 'done' ? { ...item, status: 'ready', outputs: [], message: '' } : item);
  }
}
function BlobImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return <img src={url || undefined} alt={alt}/>;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function errorText(error: unknown, language: Language, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (language === 'en') return error.message;
  return fallback;
}
export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('myfiletool-language');
    return languages.includes(saved as Language) ? saved as Language : 'en';
  });
  const t = copy[language];
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'myfiletool · Gentle file tools' : 'myfiletool · 輕輕工具';
    localStorage.setItem('myfiletool-language', language);
  }, [language]);
  const [items, dispatch] = useReducer(reducer, []);
  const itemsRef = useRef(items); itemsRef.current = items;
  const [kind, setKind] = useState<Kind>('image');
  const [options, setOptions] = useState<Record<Kind, Options>>({ image: { ...defaults }, pdf: { ...defaults } });
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [adding, setAdding] = useState(false), [zipping, setZipping] = useState(false), [drag, setDrag] = useState(false), [privacy, setPrivacy] = useState(false);
  const [preview, setPreview] = useState<{ name: string; blob: Blob } | null>(null), [webp, setWebp] = useState(false);
  const input = useRef<HTMLInputElement>(null), aborter = useRef<AbortController | null>(null), removed = useRef(new Set<string>()), epoch = useRef(0), importLock = useRef(false), running = useRef(false), modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1; setWebp(canvas.toDataURL('image/webp').startsWith('data:image/webp')); return () => aborter.current?.abort(); }, []);
  useEffect(() => { if (preview || privacy) modal.current?.showModal(); else modal.current?.close(); }, [preview, privacy]);
  const visible = items.filter(item => item.kind === kind && item.name.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || item.status === filter));
  const selected = visible.filter(item => item.selected);
  const completed = selected.filter(item => item.status === 'done');
  const outputs = completed.flatMap(item => item.outputs);
  const o = options[kind], canRun = selected.some(item => item.status !== 'done');
  const labels: Record<Status, string> = { ready: t.ready, running: t.running, done: t.done, error: t.error, cancelled: t.cancelled };
  function change(patch: Partial<Options>) { setOptions(current => ({ ...current, [kind]: { ...current[kind], ...patch } })); dispatch({ type: 'stale', kind }); }
  async function add(files: File[]) {
    if (importLock.current) return;
    importLock.current = true; setAdding(true);
    const generation = epoch.current, accepted: Item[] = [], errors: string[] = [];
    let count = itemsRef.current.length;
    try {
      for (const file of files) {
        if (count >= 20) { errors.push(t.limit); break; }
        try {
          const detected = await identify(file);
          if (detected === 'image') { await checkPixelHeader(file); await rejectAnimation(file); }
          let pageCount: number | undefined;
          if (detected === 'pdf' && __PDF_READY__) {
            const { pdfInfo } = await import('./pdf-runtime');
            pageCount = await pdfInfo(file);
          }
          accepted.push({ id: crypto.randomUUID(), file, pageCount, name: file.name, kind: detected, status: 'ready', selected: true, outputs: [], message: '', downloaded: false });
          count++;
        } catch (error) { errors.push(errorText(error, language, t.readFailed)); }
      }
      if (epoch.current === generation) {
        dispatch({ type: 'add', items: accepted });
        if (accepted.length) setKind(accepted[0].kind);
        setNotice(errors.length ? [...new Set(errors)].join(' ') : accepted.length + ' ' + t.filesAdded);
      }
    } finally { importLock.current = false; setAdding(false); }
  }
  function remove(id: string) {
    removed.current.add(id);
    if (itemsRef.current.find(item => item.id === id)?.status === 'running') aborter.current?.abort();
    dispatch({ type: 'remove', id }); setPreview(null);
  }
  function clear() {
    if (items.some(item => item.outputs.length && !item.downloaded) && !confirm(t.clearConfirm)) return;
    epoch.current++; aborter.current?.abort();
    for (const item of items) removed.current.add(item.id);
    dispatch({ type: 'clear' }); setPreview(null); setNotice(t.cleared);
  }
  async function run() {
    if (running.current) return;
    running.current = true; setBusy(true); setNotice('');
    const jobs = selected.filter(item => item.status !== 'done'), snapshot = { ...o }, generation = epoch.current, controller = new AbortController();
    aborter.current = controller;
    try {
      for (const job of jobs) {
        if (controller.signal.aborted || epoch.current !== generation) break;
        if (removed.current.has(job.id)) continue;
        dispatch({ type: 'patch', id: job.id, patch: { status: 'running', message: t.reading, outputs: [], downloaded: false } });
        try {
          const result = await tools[job.kind].run(job.file, job.name, snapshot, { signal: controller.signal, progress: () => dispatch({ type: 'patch', id: job.id, patch: { message: t.processing } }) });
          if (controller.signal.aborted || epoch.current !== generation || removed.current.has(job.id)) continue;
          const existing = itemsRef.current.filter(item => item.id !== job.id).flatMap(item => item.outputs).reduce((total, output) => total + output.blob.size, 0);
          if (existing + result.reduce((total, output) => total + output.blob.size, 0) > MAX_OUTPUT) throw Error(t.sessionLimit);
          dispatch({ type: 'patch', id: job.id, patch: { status: 'done', outputs: result, message: '' } });
        } catch (error) {
          if (epoch.current === generation && !removed.current.has(job.id))
            dispatch({ type: 'patch', id: job.id, patch: { status: controller.signal.aborted ? 'cancelled' : 'error', message: controller.signal.aborted ? t.cancelledMessage : errorText(error, language, t.processingFailed) } });
        }
      }
    } finally {
      if (controller.signal.aborted && epoch.current === generation)
        for (const job of jobs) if (itemsRef.current.find(item => item.id === job.id)?.status === 'running')
          dispatch({ type: 'patch', id: job.id, patch: { status: 'cancelled', message: t.cancelledMessage } });
      running.current = false; setBusy(false); aborter.current = null;
    }
  }
  async function zip() {
    if (!outputs.length || zipping) return;
    setZipping(true); const generation = epoch.current;
    try {
      const archive = await makeZip(outputs);
      if (generation !== epoch.current) return;
      download(archive, 'myfiletool-results.zip');
      completed.forEach(item => dispatch({ type: 'patch', id: item.id, patch: { downloaded: true } }));
      setNotice(t.zipReady.replace('{count}', String(outputs.length)));
    } catch (error) { setNotice(errorText(error, language, t.zipFailed)); }
    finally { setZipping(false); }
  }
  return <div className="shell">
    <header><a className="brand" href={import.meta.env.BASE_URL}><span className="brand-mark">rw</span>myfiletool<span className="brand-dot">.</span></a><div className="header-right"><span className="local-badge"><span/>{t.local}</span><button className="text-button" onClick={() => setPrivacy(true)}>{t.privacy}</button><div className="language-switch" role="group" aria-label="Language">{languages.map((value, index) => <button key={value} type="button" lang={value} aria-label={['English', '简体中文', '繁體中文'][index]} aria-pressed={language === value} className={language === value ? 'active' : ''} onClick={() => setLanguage(value)}>{['EN', '简', '繁'][index]}</button>)}</div></div></header>
    <main><section className="intro"><span className="eyebrow">{t.eyebrow}</span><h1>{t.heading}</h1><p>{t.intro}</p></section>
    <div className="workspace-top"><div className="tabs" role="tablist" aria-label={t.settings}>{(['image', 'pdf'] as Kind[]).map(value => <button role="tab" aria-selected={kind === value} className={kind === value ? 'active' : ''} key={value} onClick={() => setKind(value)}>{value === 'image' ? t.image : t.pdf}<small>{items.filter(item => item.kind === value).length || ''}</small></button>)}</div><span className="session-note">{t.session}</span></div>
    {kind === 'pdf' && !__PDF_READY__ && <p className="dependency-warning" role="status">{t.dependency}</p>}
    <div className="workspace"><section className="upload-panel">
      <div className={'dropzone ' + (drag ? 'dragging' : '')} onDragOver={event => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); void add([...event.dataTransfer.files]); }}>
        <div className="upload-icon">＋</div><h2>{t.drop}</h2><p>{t.dropHint}</p><button className="primary" disabled={adding} onClick={() => input.current?.click()}>{adding ? t.checking : items.length ? t.add : t.choose}</button><input ref={input} aria-label={t.choose} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" hidden onChange={event => { void add([...event.target.files || []]); event.target.value = ''; }}/><small>JPG / PNG / WebP ≤ 25 MB · PDF ≤ 50 MB</small>
      </div>
    </section><section className="files-panel" aria-label={t.queue}>
      <div className="queue-heading"><h2>{t.queue} <span>{visible.length}</span></h2><button className="text-button" disabled={!items.length} onClick={clear}>{t.clear}</button></div>
      <div className="filters"><input aria-label={t.search} placeholder={t.search} value={query} onChange={event => setQuery(event.target.value)}/><select aria-label={t.all} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{t.all}</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
      {visible.length ? <><label className="select-all"><input type="checkbox" checked={visible.every(item => item.selected)} onChange={event => visible.forEach(item => dispatch({ type: 'patch', id: item.id, patch: { selected: event.target.checked } }))}/>{t.selectAll}<span>{selected.length} {t.selected}</span></label>
        <div className="file-list">{visible.map(item => {
          const size = item.outputs.reduce((total, output) => total + output.blob.size, 0);
          return <article className="file-card" key={item.id}><div className="file-main"><input type="checkbox" aria-label={t.selected + ' ' + item.name} checked={item.selected} onChange={event => dispatch({ type: 'patch', id: item.id, patch: { selected: event.target.checked } })}/><div className="file-icon">{item.kind === 'image' ? <BlobImage blob={item.file} alt=""/> : 'PDF'}</div><div className="file-info"><input className="filename" aria-label={t.rename + ' ' + item.file.name} disabled={busy} value={item.name} onChange={event => dispatch({ type: 'patch', id: item.id, patch: { name: event.target.value, status: 'ready', outputs: [], message: t.renamed } })}/><small>{item.pageCount ? t.pageTotal.replace('{count}', String(item.pageCount)) + ' · ' : ''}{bytes(item.file.size)}{size > 0 && <> → {bytes(size)} <span className={size > item.file.size ? 'larger' : 'saved'}>{size > item.file.size ? t.bigger : t.saved} {Math.abs(100 - size / item.file.size * 100).toFixed(1)}%</span></>}</small></div><button className="icon-button" aria-label={t.remove + ' ' + item.name} onClick={() => remove(item.id)}>×</button></div><div className="file-status"><span className={'status ' + item.status}>{labels[item.status]}</span><span>{item.message}</span>{item.kind === 'image' && <button className="text-button" onClick={() => setPreview({ name: item.file.name, blob: item.file })}>{t.viewOriginal}</button>}</div>{item.outputs.length > 0 && <details open={item.outputs.length === 1}><summary>{item.outputs.length} {t.results}</summary><div className="output-list">{item.outputs.map((result, index) => <div className="output" key={index}><button className="thumbnail" aria-label={t.preview + ' ' + result.name} onClick={() => setPreview({ name: result.name, blob: result.blob })}><BlobImage blob={result.blob} alt={result.name}/></button><div><span>{result.name}</span><small>{result.width} × {result.height} · {bytes(result.blob.size)}</small></div><button className="text-button" onClick={() => { download(result.blob, result.name); if (item.outputs.length === 1) dispatch({ type: 'patch', id: item.id, patch: { downloaded: true } }); }}>{t.download} ↓</button></div>)}</div></details>}{size > item.file.size && item.kind === 'image' && <button className="text-button" onClick={() => download(item.file, item.file.name)}>{t.original}</button>}</article>;
        })}</div></> : <div className="empty"><h3>{items.length ? t.noMatch : t.empty}</h3><p>{items.length ? t.noMatchHint : t.emptyHint}</p></div>}
    </section>
    <aside className="settings"><div className="settings-title"><h2>{t.settings}</h2></div><fieldset disabled={busy}><label>{t.format}<select value={o.format} onChange={event => change({ format: event.target.value as Options['format'] })}><option value="image/jpeg">{t.jpeg}</option><option value="image/png">{t.png}</option><option value="image/webp" disabled={!webp}>{t.webp}{!webp ? t.unsupported : ''}</option></select></label>{o.format !== 'image/png' ? <label>{t.quality}<strong>{Math.round(o.quality * 100)}%</strong><input type="range" min="10" max="100" value={o.quality * 100} onChange={event => change({ quality: Number(event.target.value) / 100 })}/><span className="range-labels"><small>{t.smaller}</small><small>{t.detail}</small></span></label> : <p className="hint">{t.pngHint}</p>}
      <div className="divider"/>{kind === 'image' ? <><label>{t.maxSize} <span className="optional">{t.optional}</span></label><div className="dimensions"><label><small>{t.width}</small><input aria-label={t.width} type="number" min="1" max="10000" value={o.maxWidth} onChange={event => change({ maxWidth: Number(event.target.value) })}/></label><span>×</span><label><small>{t.height}</small><input aria-label={t.height} type="number" min="1" max="10000" value={o.maxHeight} onChange={event => change({ maxHeight: Number(event.target.value) })}/></label></div><p className="hint">{t.imageHint}</p></> : <><label>{t.dpi}<select value={o.dpi} onChange={event => change({ dpi: Number(event.target.value) })}>{[96, 150, 200, 300].map(value => <option key={value} value={value}>{value} DPI{value === 150 ? ' · ' + t.recommended : ''}</option>)}</select></label><label>{t.pages}<input placeholder={t.pagesPlaceholder} value={o.pages} onChange={event => change({ pages: event.target.value })}/></label><p className="hint">{t.pdfHint}</p></>}</fieldset>
      <div className="settings-bottom"><p><span className="mini-dot"/>{t.unchanged}</p><button className="primary wide" disabled={busy || !canRun || o.maxWidth < 1 || o.maxHeight < 1} onClick={() => void run()}>{busy ? t.processing : t.process}</button>{busy && <button className="secondary wide" onClick={() => aborter.current?.abort()}>{t.cancel}</button>}<button className="secondary wide" disabled={!outputs.length || zipping} onClick={() => void zip()}>{zipping ? t.zipping : t.zip}</button><small>{t.visibleResults} · {outputs.length} {t.resultCount}</small></div>
    </aside></div>
    <div className="notice" role="status" aria-live="polite">{notice || (busy ? t.busy : t.readyHint)}</div><div className="trust-row"><span>{t.noTracking}</span><span>{t.noUpload}</span><span>{t.noHistory}</span></div>
    </main><footer><span>© {new Date().getFullYear()} rongwei · myfiletool / 轻轻工具</span><a href="https://rongweiww.com" target="_blank" rel="noopener noreferrer">rongweiww.com</a></footer>
    <dialog ref={modal} onCancel={() => { setPreview(null); setPrivacy(false); }} onClick={event => { if (event.target === modal.current) { setPreview(null); setPrivacy(false); } }}><div className="modal-head"><h2>{preview ? t.previewTitle : t.privacyTitle}</h2><button aria-label={t.close} className="icon-button" onClick={() => { setPreview(null); setPrivacy(false); }}>×</button></div>{preview ? <><p className="preview-name">{preview.name}</p><div className="preview"><BlobImage blob={preview.blob} alt={preview.name}/></div></> : <div className="privacy-copy"><p>{t.privacyOne}</p><p>{t.privacyTwo}</p><p>{t.privacyThree}</p></div>}</dialog>
  </div>;
}
