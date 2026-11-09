// Run with a local server: node tests/toolbar-browser.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { generateKeyPairSync, sign } = require('node:crypto');
(async()=>{
 const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const pub=pair.publicKey.export({type:'spki',format:'der'}).toString('base64url');
 const payload=Buffer.from(JSON.stringify({p:'pro',e:0}));
 const key=`VPL1.${payload.toString('base64url')}.${sign('sha256',payload,{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1365,height:768},serviceWorkers:'block'});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Fixture-only signing key; the production verification key is never changed on disk.
  await page.route('**/js/license.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../web/js/license.js','utf8').replace(/var PUBKEY_SPKI_B64URL = "[^"]+"/,`var PUBKEY_SPKI_B64URL = "${pub}"`)}));
  await page.addInitScript(k=>{if(window===window.top)localStorage.setItem('vpvie.license',k);},key);
  await page.goto((process.env.VPVIE_TEST_URL||'http://127.0.0.1:8000')+'/bang.html');
  await page.waitForFunction(()=>window.__vp&&window.VPLicense.isActive());
  await page.evaluate(()=>window.__vp.closeLibrary());
  assert.equal(await page.locator('#btn-license').isVisible(),false);
  assert.equal(await page.locator('#ai-note').count(),0);
  assert.equal(await page.locator('[data-erase="stroke"] svg').count(),1);
  await page.locator('#btn-solid').click();
  await page.locator('#geo-menu').waitFor({state:'visible'});
  assert.ok((await page.locator('#geo-menu').textContent()).includes('Trung điểm'));
  await page.locator('#geo-menu button').filter({hasText:'Trung điểm'}).click();
  await page.locator('[data-geo="line"]').click();
  assert.equal(await page.evaluate(()=>window.__vp.state.tool),'arrow');
  assert.equal(await page.evaluate(()=>window.__vp.state.arrowStyle),'dash');
  const board=await page.locator('#paper').boundingBox();
  await page.mouse.move(board.x+80,board.y+180);await page.mouse.down();await page.mouse.move(board.x+280,board.y+240);await page.mouse.up();
  assert.equal(await page.evaluate(()=>window.__vp.state.items.at(-1).style),'dash');
  await page.locator('#btn-shapes').click();
  const names=['Lăng trụ xiên','Lăng trụ xiên đáy bình hành','Hình chóp cụt','Hình nón cụt','Hình trụ cụt','Hình nêm (kiểu 1)','Hình nêm (kiểu 2)','Chỏm cầu','Mặt phẳng'];
  for (const name of names) {
   const button=page.locator('#shapes-menu button').filter({has:page.locator('span').filter({hasText:new RegExp('^'+name.replace(/[()]/g,'\\$&')+'$')})});
   await button.click();
   assert.ok(await page.evaluate(()=>{const it=window.__vp.state.items.at(-1);return it.type==='solid'&&(it.segs.length||it.ellipses.length)&&it.segs.every(s=>[s.x1,s.y1,s.x2,s.y2].every(Number.isFinite));}));
   await page.locator('#btn-shapes').click();
  }
  await page.locator('#btn-shapes').click();
  await page.locator('#btn-web').click(); await page.locator('#web-url').fill('javascript:alert(1)'); await page.locator('#web-add').click();assert.equal(await page.locator('iframe.ov-web').count(),0);
  await page.locator('#web-url').fill('https://example.com'); await page.locator('#web-add').click();
  assert.equal(await page.locator('iframe.ov-web').getAttribute('src'),'https://example.com/');
  assert.ok((await page.locator('.ov-web-status').textContent()).includes('chặn nhúng'));
  await page.screenshot({path:process.env.TOOLBAR_SCREENSHOT||'/tmp/vpvie-toolbar.png'});
  assert.deepEqual(errors,[]);
  for(const width of [1024,1365,1920]){
    await page.setViewportSize({width,height:768});
    assert.ok(await page.locator('.nr-row-tools').evaluate(el=>el.scrollWidth<=el.clientWidth));
  }
  console.log('PASS: activated UI, SVG eraser, dynamic menu, dashed drawing, nine added solids, safe web URLs and responsive toolbar.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
