const BASE = process.env.E2E_SITE ?? 'http://localhost:4173'; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const routes=['','/about','/about/board','/about/executive','/about/chairman-message','/about/gm-message','/sectors','/water','/plastic','/preforms','/caps','/products','/products/al-quds-water-1-5l','/products/preform-200ml','/food','/real-estate','/real-estate/academy-house','/careers','/careers/accountant','/contact','/privacy','/terms'];
let bad=0, total=0;
for (const lang of ['ar','en']) for (const r of routes) {
  const t=await (await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();
  const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(x=>ws.onopen=x);
  const issues=[]; let id=0; const pend=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
    if(m.method==='Log.entryAdded'&&['error','warning'].includes(m.params.entry.level)) issues.push('LOG '+m.params.entry.text.slice(0,160)+' '+(m.params.entry.url??''));
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error') issues.push('CONSOLE '+m.params.args.map(a=>a.value??a.description??'').join(' ').slice(0,180));
    if(m.method==='Runtime.exceptionThrown') issues.push('EXC '+(m.params.exceptionDetails.exception?.description??'').split('\n')[0]);
    if(m.method==='Network.loadingFailed'&&!m.params.canceled) issues.push('NETFAIL '+m.params.errorText+' '+(m.params.blockedReason??''));};
  const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}))});
  await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`${BASE}/${lang}${r}?introAt=9`}); await sleep(2500);
  await send('Runtime.evaluate',{awaitPromise:true,expression:`(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}})()`});
  const v=(await send('Runtime.evaluate',{returnByValue:true,expression:`({h1:document.querySelector('h1')?.textContent?.trim().slice(0,30),imgs:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,fonts:[...document.fonts].filter(f=>f.status==='loaded').length,iframe:!!document.querySelector('iframe')})`})).result.result.value;
  total++; if(issues.length){bad++; console.log('✗ /'+lang+r, JSON.stringify(v)); issues.slice(0,4).forEach(i=>console.log('   '+i))} else console.log('✓ /'+lang+r, 'fonts:'+v.fonts, v.iframe?'map-iframe':'');
  await fetch('http://127.0.0.1:9222/json/close/'+t.id); ws.close();
}
console.log(bad?`\n${bad}/${total} pages with CSP/console problems`:`\nAll ${total} pages clean under the production CSP`); process.exit(bad?1:0);
