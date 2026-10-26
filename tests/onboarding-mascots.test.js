import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { defaults } from '../docs/src/domain.js';
import { STEPS, wizardView } from '../docs/src/onboarding.js';

const markup = (step) =>
  parseHTML('<html><body>' + wizardView(defaults().settings, step) + '</body></html>').document;

test('each of the nine onboarding screens has its own mascot pose, with no green favicon background', () => {
  assert.equal(STEPS.length, 9);
  for (let step = 0; step < STEPS.length; step++) {
    const doc = markup(step);
    const desktop = doc.querySelectorAll('.nm-story-mascot');
    const mobile = Array.from(doc.querySelectorAll('.nm-mascot')).filter(el => !el.classList.contains('nm-story-mascot'));
    assert.equal(desktop.length, 1, 'desktop mascot step ' + step);
    assert.equal(mobile.length, 1, 'mobile mascot step ' + step);
    assert.ok(desktop[0].classList.contains('nm-mood-' + step));
    assert.ok(mobile[0].classList.contains('nm-mood-' + step));
    assert.ok(mobile[0].getAttribute('aria-label')?.length);
    assert.equal(doc.querySelectorAll('.nm-mascot img').length, 0);
    assert.equal(doc.querySelectorAll('img[src*="brand-icon-512"]').length, 0);
  }
});

test('onboarding mascot atlas is transparent artwork served as a local lightweight webp', () => {
  const path = new URL('../docs/assets/onboarding-mascots.webp', import.meta.url);
  assert.ok(existsSync(path));
  const binary = readFileSync(path);
  assert.equal(binary.toString('utf8', 0, 4), 'RIFF');
  assert.ok(binary.length < 120_000, 'atlas should stay below 120 kB');
  const css = readFileSync(new URL('../docs/assets/onboarding.css', import.meta.url), 'utf8');
  assert.match(css, /background-image:\s*url\('onboarding-mascots\.webp'\)/);
  for (let mood = 0; mood < 9; mood++) assert.match(css, new RegExp('\\.nm-mood-' + mood + ' \\{'));
});

test('mobile onboarding keeps heading, progress and primary action within a fixed viewport', () => {
  const css = readFileSync(new URL('../docs/assets/onboarding.css', import.meta.url), 'utf8');
  assert.match(css, /body\.onboarding\s*\{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.nm-onboarding \.nm-footer\s*\{[^}]*flex-shrink:\s*0/);
  assert.match(css, /\.nm-onboarding \.nm-fields\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  for(let i=0;i<STEPS.length;i++){
    const doc=markup(i);
    assert.ok(doc.querySelector('form[data-form="wizard"] .nm-primary'));
    assert.ok(doc.querySelector('h1#nm-step-title'));
  }
});
