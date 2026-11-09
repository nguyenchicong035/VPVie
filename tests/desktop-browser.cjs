// DISPLAY=:99 node tests/desktop-browser.cjs (requires Electron and an X11 display).
const {_electron}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const {generateKeyPairSync,sign}=require('node:crypto');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vpvie-desktop-'));
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'"});res.end('<h1>VPVie embedded browser works</h1>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.2',resolve));
 let app;
 try{
  app=await _electron.launch({executablePath:require('../desktop/node_modules/electron'),args:['--no-sandbox','--disable-gpu','--user-data-dir='+profile,path.join(__dirname,'../desktop')],env:{...process.env,VPVIE_FORCE_OFFLINE:'1'},timeout:20000});
  const page=await app.firstWindow();await page.waitForFunction(()=>window.__vp&&window.VPLicense);
  // Electron sessions need native cleanup: Playwright page routes cannot intercept
  // requests already handled by a service worker from the initial navigation.
  await app.evaluate(async({session})=>{
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://127.0.0.1:8750/sw.js*']},(_details,callback)=>callback({cancel:true}));
    await session.defaultSession.clearStorageData({storages:['serviceworkers','cachestorage']});
  });
  const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const pub=pair.publicKey.export({type:'spki',format:'der'}).toString('base64url');
  await page.route('**/js/license.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../web/js/license.js'),'utf8').replace(/var PUBKEY_SPKI_B64URL = "[^"]+"/,`var PUBKEY_SPKI_B64URL = "${pub}"`)}));
  const mid=await page.evaluate(()=>window.VPLicense.machineId());
  const payload=Buffer.from(JSON.stringify({m:mid,p:'pro',e:0}));
  const key=`VPL1.${payload.toString('base64url')}.${sign('sha256',payload,{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
  await page.evaluate(k=>localStorage.setItem('vpvie.license',k),key);
  await page.reload();await page.waitForFunction(()=>window.VPLicense?.isActive()&&window.__vp);
  await page.waitForFunction(()=>document.querySelector('#btn-license').hidden);
  assert.equal((await page.evaluate(()=>window.VPDesktop.readActivation())).key,key);
  await page.evaluate(()=>window.__vp.closeLibrary());
  await require('./document-flows.cjs').verifyDocumentFlows(page);
  await require('./table-resize-flows.cjs').verifyTableResize(page);
  await require('./pdf-fit-flows.cjs').verifyPdfFit(page);
  await app.evaluate(({Menu})=>{const view=Menu.getApplicationMenu().items.find(i=>i.label==='Hiển thị');view.submenu.items.find(i=>i.label==='Phóng to trang').click();});
  await page.waitForFunction(()=>window.VPViewport.getState().zoom===1.25);
  await page.locator('#page-zoom-reset').click();
  await require('./zoom-flows.cjs').verifyZoom(page);
  await require('./zoom-flows.cjs').verifyPinch(page, await page.context().newCDPSession(page));
  await page.locator('#btn-web').click(); await page.locator('#web-url').fill(`http://127.0.0.2:${server.address().port}`); await page.locator('#web-add').click();
  try { await page.waitForFunction(()=>{const v=document.querySelector('webview');try{return v&&v.getURL().includes('127.0.0.2')&&!v.isLoading();}catch{return false;}},null,{timeout:10000}); } catch(e) { console.log(await page.evaluate(()=>({webview:document.querySelector('webview')?.outerHTML,status:document.querySelector('.ov-web-status')?.textContent,bridge:!!window.VPDesktop,overlays:window.__vp.state.overlays}))); console.log(await app.evaluate(({webContents})=>webContents.getAllWebContents().map(w=>({id:w.id,url:w.getURL(),type:w.getType()})))); throw e; }
  const id=await page.locator('webview').evaluate(v=>v.getWebContentsId());
  const guest=await app.evaluate(async({webContents},id)=>{
    const wc=webContents.fromId(id);return {prefs:wc.getLastWebPreferences(),content:await wc.executeJavaScript('({text:document.body.textContent,node:typeof require,bridge:typeof VPDesktop})')};
  },id);
  assert.ok(guest.content.text.includes('VPVie embedded browser works'));
  assert.equal(guest.content.node,'undefined');assert.equal(guest.content.bridge,'undefined');
  assert.equal(guest.prefs.nodeIntegration,false);assert.equal(guest.prefs.contextIsolation,true);assert.equal(guest.prefs.sandbox,true);
  await page.screenshot({path:process.env.DESKTOP_SCREENSHOT||'/tmp/vpvie-desktop.png'});
  await page.evaluate(()=>localStorage.removeItem('vpvie.license'));
  await page.reload(); try { await page.waitForFunction(()=>window.VPLicense?.isActive(),null,{timeout:10000}); } catch(e) { console.log(await page.evaluate(async()=>({status:window.VPLicense?.status(),record:!!(await window.VPDesktop.readActivation())?.key,controller:!!navigator.serviceWorker.controller,registrations:(await navigator.serviceWorker.getRegistrations()).length}))); throw e; }
  assert.equal(await page.evaluate(()=>window.VPLicense.machineId()),mid);
  console.log('PASS: native guest loads a frame-blocked site without Node or app bridge; activation survives localStorage loss and reload.');
 }finally{if(app)await app.close();await new Promise(r=>server.close(r));fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
