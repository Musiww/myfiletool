import {cp,mkdir,access} from 'node:fs/promises';
try { await access('node_modules/pdfjs-dist/build/pdf.mjs'); }
catch { if(process.argv.includes('--optional')){console.warn('PDF dependency missing: image preview is available; run npm install to enable PDF.');process.exit(0);}throw Error('pdfjs-dist is not installed. Run npm install before building.'); }
await mkdir('public/pdf-assets',{recursive:true});
for(const name of ['pdf.mjs','pdf.worker.min.mjs'])await cp('node_modules/pdfjs-dist/build/'+name,'public/pdf-assets/'+name);
for(const dir of ['cmaps','standard_fonts','wasm','iccs']){try{await cp('node_modules/pdfjs-dist/'+dir,'public/pdf-assets/'+dir,{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}}
await cp('node_modules/pdfjs-dist/LICENSE','public/pdf-assets/LICENSE');

