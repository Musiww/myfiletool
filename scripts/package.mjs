import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {makeZip} from '../src/zip.ts';
// Source only. No personal inputs, dependencies, cached downloads or incomplete dist.
const roots=['src','scripts','tests','docs','.github'];
const names=['README.md','README.zh-CN.md','DESIGN.md','LICENSE','package.json','tsconfig.json','vite.config.ts','playwright.config.ts','.gitignore','.nvmrc','index.html'];
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+entry.name;if(entry.isDirectory())await collect(p);else names.push(p);}}
for(const root of roots)await collect(root);
try{await readFile('package-lock.json');names.push('package-lock.json');}catch{}
const outputs=[];for(const name of names)outputs.push({name:'myfiletool/'+name,blob:new Blob([await readFile(name)]),width:0,height:0});
const target=resolve(process.argv[2]||'../myfiletool-source.zip');await mkdir(dirname(target),{recursive:true});await writeFile(target,new Uint8Array(await(await makeZip(outputs)).arrayBuffer()));console.log(target);
