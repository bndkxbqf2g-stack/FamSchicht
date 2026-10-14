import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPwaInstallContext,
  pwaInstallState,
} from '../src/pwa-install.js';

test('PWA install context recognizes installed iPhone and iPad sessions', () => {
  assert.deepEqual(detectPwaInstallContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    platform: 'iPhone',
    standalone: true,
  }), {isIos: true, isInstalled: true, canPrompt: false});
  assert.equal(detectPwaInstallContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  }).isIos, true);
});

test('PWA install state prioritizes installed, native prompt and iOS guidance', () => {
  assert.equal(pwaInstallState({isInstalled: true, canPrompt: true}).kind, 'installed');
  assert.equal(pwaInstallState({canPrompt: true}).kind, 'prompt');
  assert.match(pwaInstallState({isIos: true}).message, /Zum Home-Bildschirm/);
  assert.equal(pwaInstallState({}).kind, 'manual');
});

