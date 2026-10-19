import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');

test('home overview exposes the Familienruhe focus card without changing task actions', () => {
  assert.match(main, /const openTaskCount = taskOccurrences\(displayEntries/);
  assert.match(main, /class="home-focus-card"/);
  assert.match(main, /data-task-new="true"/);
  assert.match(styles, /\.home-highlights\{[\s\S]*grid-template-columns:minmax\(0,1\.35fr\) minmax\(220px,\.65fr\)/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*\.home-highlights\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('wall mode is visibly branded as the Schichtzentrale and keeps read-only styling', () => {
  assert.match(main, /isWallMode\(displayMode\) \? 'Schichtzentrale'/);
  assert.match(main, /Fokussierte Wandansicht/);
  assert.match(styles, /\.familycal-shell\.display-wall\{/);
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(styles, /--wall-mint:#a7f3d0/);
  assert.match(styles, /\.display-wall \.calendar-toolbar\{background:transparent\}/);
  assert.match(styles, /\.display-wall \.entry\{font-size:14px/);
  assert.match(styles, /\.display-wall \.wall-exit\{border-color:var\(--wall-mint\)/);
});

