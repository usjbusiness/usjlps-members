const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.join(__dirname,'../..');
const core=fs.readFileSync(path.join(root,'src/lib/emailImages.ts'),'utf8');
for(const name of ['welcome-email','announce-email']) {
 const server=fs.readFileSync(path.join(root,'supabase/functions',name,'index.ts'),'utf8');
 const block=server.slice(server.indexOf('// EMAIL_IMAGE_CORE_START'),server.indexOf('// EMAIL_IMAGE_CORE_END')+'// EMAIL_IMAGE_CORE_END'.length);
 assert.equal(block,core.replace(/export /g,'').trim());
}
const js=ts.transpileModule(core,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('exports',js)(mod.exports);const m=mod.exports;
const image={id:'11111111-1111-4111-8111-111111111111',path:'22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111.png',alt:'A <poster> "for" LPS',width:512};
assert.deepEqual(m.validateEmailImages(undefined),[]);
assert.deepEqual(m.validateEmailImages([image]),[image]);
for(const patch of [{width:500},{width:'160'},{path:'javascript:alert(1)'},{path:'../logo.png'},{id:'bad'},{alt:'x'.repeat(181)}])assert.throws(()=>m.validateEmailImages([{...image,...patch}]));
const marker=m.imageMarker(image.id),body='First paragraph.\n\n'+marker+'\n\nLast paragraph.';
const html=m.emailBodyHtml(body,[image],()=>`cid:image`);
assert(html.indexOf('First paragraph.')<html.indexOf('<img'));
assert(html.indexOf('<img')<html.indexOf('Last paragraph.'));
assert(html.includes('width="512"'));assert(html.includes('max-width:100%'));assert(html.includes('&lt;poster&gt; &quot;for&quot;'));
assert(!html.includes(marker));assert(m.emailBodyText(body,[image]).includes('[Image:'));
assert.equal(m.emailBodyText(marker,[]),'[Image unavailable]');
assert(!m.emailBodyHtml('<img src=x onerror=bad()>',[],()=> '').includes('<img'));
assert.equal((m.emailBodyHtml(marker+marker,[image],()=> 'cid:image').match(/<img/g)||[]).length,2);
// The browser and server letter builders use the same body renderer.
const client=fs.readFileSync(path.join(root,'src/features/members/welcomeEmail.ts'),'utf8');assert(client.includes('emailBodyHtml(fillName(p.body, p.firstName), p.emailImages'));
console.log('Image model, escaping, positioning, missing-image fallback and standalone helper parity passed.');
