import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['app.js', 'vite.config.js', 'src', 'scripts', 'test', 'tests', 'public'];
const sourceFiles = [];

function collect(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (/\.(?:js|mjs)$/.test(absolute)) sourceFiles.push(absolute);
    return;
  }
  for (const entry of fs.readdirSync(absolute, {withFileTypes: true})) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    collect(path.join(target, entry.name));
  }
}

for (const target of roots) collect(target);
sourceFiles.sort();

const failures = [];
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
  if (result.status !== 0) {
    failures.push({file: path.relative(root, file), output: (result.stderr || result.stdout || '').trim()});
  }
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure.file}`);
    if (failure.output) console.error(failure.output);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS statische JavaScript-Syntaxprüfung: ${sourceFiles.length} Dateien`);
}

