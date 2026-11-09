const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto, generateKeyPairSync, sign } = require('node:crypto');
const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const source = fs.readFileSync(__dirname + '/../web/js/license.js', 'utf8').replace(/var PUBKEY_SPKI_B64URL = "[^"]+"/, `var PUBKEY_SPKI_B64URL = "${pub}"`);
function key(data) {
  const payload = Buffer.from(JSON.stringify(data));
  return `VPL1.${payload.toString('base64url')}.${sign('sha256', payload, { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
function load(store, bridge, ua = 'Electron/33 VPVie/1.1.4') {
  const context = { crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, Intl, Date,
    navigator: { userAgent: ua }, screen: { width: 1366, height: 768 },
    document: { createElement: () => ({ getContext: () => null }) },
    localStorage: { getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) },
    fetch: async () => ({ ok:false, status:404, json:async()=>({}) }), window: { VPDesktop:bridge } };
  vm.runInNewContext(source, context); return context.window.VPLicense;
}
test('activation and machine ID survive an app update and localStorage loss', async () => {
  let record = null;
  const bridge = { isApp:true, readActivation:async()=>record, writeActivation:async r=>{record={...r};} };
  const first = load(new Map(), bridge);
  const mid = await first.machineId();
  assert.equal((await first.activate(key({m:mid,p:'pro',e:0}))).ok, true);
  const updated = load(new Map(), bridge, 'Electron/40 VPVie/2.0.0');
  assert.equal(await updated.machineId(), mid);
  assert.equal((await updated.check()).active, true);
  await updated.deactivate();
  assert.equal((await load(new Map(),bridge).check()).active,false);
});
test('migrate signed machine-bound legacy key, reject invalid and expired keys', async () => {
  const mid='VPV-ABCD-EFGH-JKLM'; let record;
  const bridge={isApp:true,readActivation:async()=>null,writeActivation:async r=>{record=r;}};
  const legacy=load(new Map([['vpvie.license',key({m:mid,p:'pro',e:0})]]),bridge);
  assert.equal((await legacy.check()).active,true); assert.equal(record.mid,mid);
  for (const invalid of ['VPL1.fake.signature',key({m:mid,p:'pro',e:1})]) {
    assert.equal((await load(new Map([['vpvie.license',invalid]]),bridge).check()).active,false);
  }
  assert.equal((await legacy.verifyKey(key({m:mid,e:0}),'VPV-ZZZZ-ZZZZ-ZZZZ')).ok,false);
});
test('web profile caches its machine ID across UA changes',async()=>{
 const store=new Map();const first=await load(store,null).machineId();
 assert.equal(await load(store,null,'new version').machineId(),first);
});
