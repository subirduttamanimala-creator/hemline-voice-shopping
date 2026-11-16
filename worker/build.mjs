import {mkdir,readFile,writeFile} from 'node:fs/promises';

const staticFiles = {
  '/':'index.html',
  '/style.css':'style.css',
  '/app.mjs':'app.mjs',
  '/search.mjs':'search.mjs',
  '/ranking.mjs':'ranking.mjs',
  '/voice.mjs':'voice.mjs',
  '/transcriber.mjs':'transcriber.mjs',
  '/textiles.jpg':'textiles.jpg'
};
const entries = await Promise.all(Object.entries(staticFiles).map(async ([path,file]) => {
  const binary = file.endsWith('.jpg');
  const content = await readFile(new URL('../dist/'+file,import.meta.url),binary ? 'base64' : 'utf8');
  const type = binary ? 'image/jpeg' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'text/javascript';
  return [path,{content,type,binary}];
}));
const source = await readFile(new URL('./index.mjs',import.meta.url),'utf8');
const retailers = await readFile(new URL('./retailers.mjs',import.meta.url),'utf8');
const ranking = (await readFile(new URL('../dist/ranking.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
const output = new URL('../dist/server/',import.meta.url);
await mkdir(output,{recursive:true});
await writeFile(new URL('index.js',output),'const assets = '+JSON.stringify(Object.fromEntries(entries))+';\n'+ranking+'\n'+retailers+'\n'+source);
