import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('PWA manifest points at the installable FamSchicht shell', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'FamSchicht – Familienplaner');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.icons[0].src, './apple-touch-icon.png');
});

test('service worker has a network-first cache fallback for the app shell', () => {
  const source = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');
  assert.match(source, /famschicht-shell-v1/);
  assert.match(source, /networkFirst/);
  assert.match(source, /index\.html/);
  assert.match(source, /status: 503/);
});
