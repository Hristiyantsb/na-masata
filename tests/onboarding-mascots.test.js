import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { defaults } from '../docs/src/domain.js';
import { STEPS, wizardView } from '../docs/src/onboarding.js';
import { mascotArt } from '../docs/src/mascot.js';

const html = (step) => parseHTML('<html><body>'+wizardView(defaults().settings,step)+'</body></html>').document;

test('all onboarding screens feature their own responsive crisp mascot expression',()=>{
  assert.equal(STEPS.length,9);
  for(let step=0;step<STEPS.length;step++){
    const document=html(step);
    const desktop=document.querySelectorAll('.nm-story-mascot');
    const mobile=Array.from(document.querySelectorAll('.nm-mascot')).filter(el=>!el.classList.contains('nm-story-mascot'));
    assert.equal(desktop.length,1,'desktop step '+step);
    assert.equal(mobile.length,1,'mobile step '+step);
    for(const el of [...desktop,...mobile]){
      assert.equal(el.localName,'svg','scalable vector');
      assert.ok(el.classList.contains('nm-mood-'+step));
      assert.ok(el.getAttribute('aria-label')?.length);
      assert.equal(el.getAttribute('viewBox'),'0 0 520 370');
    }
    assert.equal(document.querySelectorAll('img[src*="brand-icon-512"]').length,0);
    assert.ok(document.querySelector('form[data-form="wizard"] .nm-primary'));
    assert.ok(document.querySelector('h1#nm-step-title'));
  }
  assert.match(mascotArt(4),/готварска шапка/);
});
test('onboarding uses distinct types of interactive input, not checkbox grids everywhere',()=>{
 const goals=html(1),time=html(4),party=html(5),stores=html(6);
 assert.equal(goals.querySelectorAll('.nm-goal').length,4);
 assert.equal(time.querySelectorAll('input[type="range"][data-input="wizard-time"]').length,1);
 assert.equal(time.querySelectorAll('.nm-appliance').length,4);
 assert.equal(party.querySelectorAll('.nm-counter button[data-action="counter"]').length,2);
 assert.equal(party.querySelectorAll('.nm-segment').length,3);
 assert.equal(stores.querySelectorAll('input[type="range"][data-input="budget-range"]').length,1);
});
test('onboarding content and button stay in a viewport with accessible overflow fallback',()=>{
 const css=readFileSync(new URL('../docs/assets/onboarding.css',import.meta.url),'utf8');
 assert.match(css,/body\.onboarding\s*\{[^}]*overflow:hidden/);
 assert.match(css,/\.nm-fields\s*\{[^}]*overflow-y:auto/);
 assert.match(css,/\.nm-footer\s*\{[^}]*flex-shrink:0/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/background-image:\s*url\('onboarding-mascots\.webp'\)/);
});
