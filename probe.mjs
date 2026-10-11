import puppeteer from 'puppeteer-core';
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT='C:/Users/MOH/AppData/Local/Temp/opencode/iabs-shot';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox','--disable-gpu','--hide-scrollbars']});
for (const [name,w,h,mob] of [['dc-d',1280,1000,false],['dc-m',390,844,true]]) {
  const p=await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.setViewport({width:w,height:h,deviceScaleFactor:1,isMobile:mob,hasTouch:mob});
  await p.goto('http://127.0.0.1:4188/',{waitUntil:'load',timeout:60000});
  await new Promise(r=>setTimeout(r,3000));
  await p.evaluate(()=>{const secs=[...document.querySelectorAll('section')];const el=secs.find(s=>s.textContent.includes('COMMUNITY HQ'));if(el)window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-100);});
  await new Promise(r=>setTimeout(r,5000));
  await p.screenshot({path:`${OUT}/${name}.png`});
  const m=await p.evaluate(()=>{
    const secs=[...document.querySelectorAll('section')];
    const comm=secs.find(s=>s.textContent.includes('COMMUNITY HQ'));
    const grid=comm?comm.querySelector(':scope > div'):null;
    const hs=grid?[...grid.children].map(c=>Math.round(c.getBoundingClientRect().height)):[];
    return {cards:hs, overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  console.log(name, JSON.stringify(m), 'errors:', errs.length?errs:'none');
  await p.close();
}
await b.close();
