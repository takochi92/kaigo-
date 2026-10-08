import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function element(value = '') {
  return {value, innerHTML:'', textContent:'', hidden:false, disabled:false, listeners:{},
    addEventListener(type, fn){this.listeners[type]=fn;}, appendChild(){},
    insertAdjacentHTML(_, html){this.innerHTML += html;}, setAttribute(){}};
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('switching prefectures ignores stale responses and clears old results', async () => {
  const ids = Object.fromEntries(['pref','city','q','cats','status','results','more','near'].map(id=>[id,element()]));
  const pending = {};
  const areas={prefs:[{code:'34',name:'広島県',count:1},{code:'13',name:'東京都',count:1}],categories:[]};
  const data=pref=>({pref,fields:['city','name','corp','address','services','cats'],rows:[],cities:[],services:[],builtAt:'2026-10-08'});
  vm.runInNewContext(fs.readFileSync('assets/search.js','utf8'),{
    document:{getElementById:id=>ids[id], createElement:()=>element()},location:{search:'',pathname:'/search.html'},
    URLSearchParams,history:{replaceState(){}},navigator:{},setTimeout,clearTimeout,
    fetch:url=>url==='data/areas.json'?Promise.resolve({ok:true,json:()=>Promise.resolve(areas)}):new Promise(resolve=>{pending[url]=resolve;})
  });
  await flush();
  ids.results.innerHTML='old result';ids.more.hidden=false;
  ids.pref.value='34';ids.pref.listeners.change();
  assert.equal(ids.results.innerHTML,'');assert.equal(ids.more.hidden,true);
  ids.pref.value='13';ids.pref.listeners.change();
  pending['data/pref/13.json']({ok:true,json:()=>Promise.resolve(data('東京都'))});await flush();
  pending['data/pref/34.json']({ok:true,json:()=>Promise.resolve(data('広島県'))});await flush();
  assert.match(ids.status.textContent,/東京都/);
  ids.pref.value='34';ids.pref.listeners.change();ids.pref.value='';ids.pref.listeners.change();
  pending['data/pref/34.json']({ok:true,json:()=>Promise.resolve(data('広島県'))});await flush();
  assert.equal(ids.status.textContent,'都道府県を選んでください。');
});

test('calculator includes full-price excess and identifies the table as within-limit estimates',()=>{
  const ids=Object.fromEntries(Object.entries({level:'1',ratio:'0.1',price:'10',day:'7',shintai:'0',seikatsu:'0',kango:'0',short:'0',yogu:'0',result:'',calc:''}).map(([id,value])=>[id,element(value)]));
  ids.day.max='7';
  const html=fs.readFileSync('hiyou.html','utf8');
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  vm.runInNewContext(script,{document:{getElementById:id=>ids[id]}});
  // 658 units x 7 days x 4.3 weeks = 19,805.8 units.
  // 16,765 x 10 x 10% + 3,040.8 x 10 = 47,173 yen.
  assert.match(ids.result.innerHTML,/47,173円/);
  assert.match(ids.result.innerHTML,/118%/);
  assert.match(ids.result.innerHTML,/width:100%/);
  assert.match(ids.result.innerHTML,/限度額内での自己負担/);
  assert.match(ids.result.innerHTML,/全額自己負担分や食費・部屋代などは対象外/);
  ids.day.value='999';ids.calc.listeners.input();assert.match(ids.result.innerHTML,/47,173円/);
});

test('invalid encoded fragments do not crash the shared script',()=>{
  const run=hash=>vm.runInNewContext(fs.readFileSync('assets/main.js','utf8'),{
    document:{currentScript:{src:'https://example.test/assets/main.js'},getElementById:()=>null},
    window:{addEventListener(){}},location:{href:'https://example.test/',hash}});
  assert.doesNotThrow(()=>run('#%'));
});
