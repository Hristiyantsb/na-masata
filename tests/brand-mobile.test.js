import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the visible brand is eDish and favicon has an opaque coral canvas',()=>{
 const html=read('docs/index.html');
 const icon=read('docs/assets/favicon.svg');
 const manifest=JSON.parse(read('docs/manifest.webmanifest'));
 assert.match(html,/<title>eDish<\/title>/);
 assert.match(html,/rel="icon" href="assets\/favicon\.svg"/);
 assert.doesNotMatch(html,/rel="icon" href="assets\/brand-icon-192\.png"/);
 assert.match(icon,/<rect width="512" height="512" fill="#f4604c"\/>/);
 assert.equal(manifest.name,'eDish');
 assert.equal(manifest.short_name,'eDish');
 assert.equal(manifest.background_color,'#ffffff');
 assert.ok(manifest.icons.some(i=>i.src==='assets/icon-512.png'&&i.purpose==='maskable'));
});
test('mobile input controls and dialogs are usable on small devices without iOS zoom',()=>{
 const html=read('docs/index.html');
 const css=read('docs/assets/mobile-polish.css');
 assert.match(html,/assets\/mobile-polish\.css/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/body:not\(\.onboarding\) dialog/);
 assert.match(css,/\.mobile-nav>a\[aria-current='page'\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('obsolete bitmap mascot atlas is not downloaded in first offline install',()=>{
 const build=read('scripts/build-sw.mjs');
 assert.match(build,/onboarding-mascots\.webp.*continue/);
 const sw=read('docs/sw.js');
 assert.doesNotMatch(sw,/"assets\/onboarding-mascots\.webp"/);
});
