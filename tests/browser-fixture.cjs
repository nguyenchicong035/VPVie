// A test-only signing key keeps browser checks independent of production licenses.
// Production source and public key remain unchanged on disk.
const fs=require('node:fs');
const {generateKeyPairSync,sign}=require('node:crypto');
exports.prepareLicensedPage=async function(page){
 const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const pub=pair.publicKey.export({type:'spki',format:'der'}).toString('base64url');
 const payload=Buffer.from(JSON.stringify({p:'pro',e:0}));
 const key=`VPL1.${payload.toString('base64url')}.${sign('sha256',payload,{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
 await page.route('**/js/license.js',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../web/js/license.js','utf8').replace(/var PUBKEY_SPKI_B64URL = "[^"]+"/,`var PUBKEY_SPKI_B64URL = "${pub}"`)}));
 await page.addInitScript(k=>{if(window===window.top)localStorage.setItem('vpvie.license',k);},key);
};
exports.openBoard=async function(page){
 await page.waitForFunction(()=>window.__vp&&window.VPLicense?.isActive());
 await page.evaluate(()=>window.__vp.closeLibrary());
};
