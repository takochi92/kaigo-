// Browser smoke check against built files; external requests are blocked.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.pdf':'application/pdf'};
const server=http.createServer((req,res)=>{
  let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/kaigo-\//,'');
  let file=path.resolve(root,rel || 'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
  if(fs.existsSync(file) && fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')&&f!=='404.html').concat(fs.readdirSync(path.join(root,'yomimono')).filter(f=>f.endsWith('.html')).map(f=>'yomimono/'+f));
 const base=`http://127.0.0.1:${server.address().port}/kaigo-/`;
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:844});
  for(const file of pages){
   await page.goto(base+file,{waitUntil:'domcontentloaded'});
   for(const large of [false,true]){
    await page.evaluate(large=>document.documentElement.classList.toggle('font-lg',large),large);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    assert.equal(overflow,false,`${file} overflows at ${width}px (large=${large})`);
   }
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'yomimono/houkatsu.html');
 const cellWidth=await page.locator('tbody td').first().evaluate(el=>el.getBoundingClientRect().width);
 assert.ok(cellWidth>150,`Explanation cell is too narrow: ${cellWidth}`);
 await page.locator('#nav-toggle').click();
 assert.equal(await page.locator('#nav-toggle').getAttribute('aria-expanded'),'true');
 await page.locator('#site-nav a').first().focus();await page.keyboard.press('Escape');
 assert.equal(await page.locator('#nav-toggle').getAttribute('aria-expanded'),'false');
 await page.goto(base+'kengaku.html');
 await page.locator('#k0-0').check();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'k0-0');
 await page.reload();assert.equal(await page.locator('#k0-0').isChecked(),true);
 const nojs=await browser.newContext({javaScriptEnabled:false});
 const fallback=await nojs.newPage();await fallback.goto(base+'index.html');
 assert.ok(await fallback.locator('header a[href="search.html"]').count());
 await nojs.close();
 assert.deepEqual(errors,[]);
 console.log(`Browser checks passed for ${pages.length} pages at 320/390/1280px, standard/large text, table widths, menu and checklist.`);
} finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
