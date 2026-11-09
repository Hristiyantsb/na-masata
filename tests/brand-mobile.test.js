import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the visible brand is На маса and favicon has an opaque forest green canvas',()=>{
 const html=read('docs/index.html');
 const icon=read('docs/assets/favicon.svg');
 const manifest=JSON.parse(read('docs/manifest.webmanifest'));
 assert.match(html,/<title>На маса<\/title>/);
 assert.match(html,/rel="icon" href="assets\/favicon\.svg"/);
 assert.doesNotMatch(html,/rel="icon" href="assets\/brand-icon-192\.png"/);
 assert.match(icon,/<rect width="128" height="128" fill="#013c26"\/>/);
 assert.equal(manifest.name,'На маса');
 assert.equal(manifest.short_name,'На маса');
 assert.equal(manifest.background_color,'#013c26');
 assert.ok(manifest.icons.some(i=>i.src==='assets/brand-icon-512.png'&&i.purpose==='maskable'));
});
test('mobile controls are usable on small phones without iOS zoom, in light and dark',()=>{
 const html=read('docs/index.html');
 const css=read('docs/assets/styles.css');
 const table=read('docs/assets/table.css');
 assert.ok(html.includes('assets/styles.css'));
 assert.ok(html.includes('assets/table.css'));
 assert.ok(html.includes('viewport-fit=cover'));
 assert.ok(css.includes('font-size: 16px;'));
 assert.ok(css.includes('min-height: 44px;'));
 assert.ok(css.includes('env(safe-area-inset-bottom)'));
 assert.ok(css.includes('.sheet[open]'));
 assert.ok(css.includes(".tab[aria-current='page']"));
 assert.match(css,/prefers-color-scheme: dark/);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.match(table,/prefers-reduced-motion:reduce/);
});
test('no eDish branding ships in the app',()=>{
 const html=read('docs/index.html');
 const sw=read('docs/sw.js');
 assert.doesNotMatch(html,/edish/i);
 assert.doesNotMatch(sw,/edish/i);
});
