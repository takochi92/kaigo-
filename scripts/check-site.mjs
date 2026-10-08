// Validate the published output, without downloading external pages.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve('dist');
if (!fs.existsSync(root)) throw new Error('Run npm run build first');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk(root);
const pages = files.filter(f => f.endsWith('.html'));
const site = fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/Sitemap:\s*(.*)\/sitemap.xml/)[1] + '/';
const siteUrl = new URL(site);
const known = new Map();
const errors = [];
const clean = html => html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>');
const unescape = str => str.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
for (const file of pages) {
  const html = fs.readFileSync(file,'utf8');
  const doc = clean(html);
  const ids = [...doc.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const rel = path.relative(root,file);
  if (new Set(ids).size !== ids.length) errors.push(`${rel}: duplicate ID`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${rel}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) errors.push(`${rel}: missing description`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${rel}: missing viewport`);
  if ((html.match(/<link rel="canonical"/g)||[]).length !== 1) errors.push(`${rel}: canonical must occur once`);
  if (!/href="[^"]*about.html"/.test(doc) && !/href="[^"]*about.html"/.test(fs.readFileSync(path.join(root,'assets/main.js'),'utf8'))) errors.push(`${rel}: missing operator link`);
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    try { if (m[1].includes('ld+json')) JSON.parse(m[2]); else if (!m[1].includes('src=')) new vm.Script(m[2]); }
    catch(e){errors.push(`${rel}: invalid script: ${e.message}`);}
  }
  known.set(file,{ids:new Set(ids),doc});
}
let links=0;
for (const [file,{doc}] of known) {
  const base = new URL(path.relative(root,file).split(path.sep).join('/'),site);
  for (const m of doc.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = unescape(m[1]);
    if (!value || /^(?:tel:|mailto:|data:|javascript:)/i.test(value)) continue;
    let url;try {url=new URL(value,base);}catch{errors.push(`${file}: invalid URL ${value}`);continue;}
    if (url.origin !== siteUrl.origin || !url.pathname.startsWith(siteUrl.pathname)) continue;
    let rel;try {rel=decodeURIComponent(url.pathname.slice(siteUrl.pathname.length));}catch{errors.push(`${file}: invalid URL encoding`);continue;}
    let dest=path.join(root,rel);
    if (url.pathname.endsWith('/')) dest=path.join(dest,'index.html');
    if (!fs.existsSync(dest)) errors.push(`${path.relative(root,file)}: missing ${value}`);
    else if (url.hash && known.has(dest) && !known.get(dest).ids.has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${path.relative(root,file)}: missing anchor ${value}`);
    links++;
  }
}
for (const file of files.filter(f=>/sitemap-\d+\.xml$/.test(f))) {
  for (const m of fs.readFileSync(file,'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url=new URL(unescape(m[1]));
    if (url.pathname.endsWith('/404.html')) errors.push('404 page must not be in sitemap');
    const rel=decodeURIComponent(url.pathname.slice(siteUrl.pathname.length));
    const target=path.join(root,rel,url.pathname.endsWith('/')?'index.html':'');
    if (!known.has(target)) errors.push(`sitemap: missing page ${url.href}`);
  }
}
if (fs.existsSync(path.join(root,'tests')) || fs.existsSync(path.join(root,'scripts'))) errors.push('Development files copied to dist');
if(errors.length){console.error(errors.slice(0,50).join('\n'));console.error(`${errors.length} errors`);process.exit(1);}
console.log(`Validated ${pages.length} pages, ${links} internal links, scripts, canonical URLs and sitemap.`);
