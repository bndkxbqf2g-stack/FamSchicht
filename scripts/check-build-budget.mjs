import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'dist', 'assets');
const files = (await readdir(assetsDir))
  .filter(file => /\.(?:js|css)$/.test(file))
  .map(file => path.join(assetsDir, file));

if (!files.length) throw new Error('Kein gebündeltes JS-/CSS-Asset in dist/assets gefunden.');

const assets = await Promise.all(files.map(async file => {
  const content = await readFile(file);
  const size = (await stat(file)).size;
  return {
    file:path.relative(root, file),
    kind:file.endsWith('.js') ? 'js' : 'css',
    size,
    gzip:gzipSync(content, {level:9}).length,
  };
}));

const totals = assets.reduce((result, asset) => ({
  raw:result.raw + asset.size,
  gzip:result.gzip + asset.gzip,
}), {raw:0, gzip:0});
const largest = kind => assets
  .filter(asset => asset.kind === kind)
  .sort((first, second) => second.size - first.size)[0];

const budgets = [
  ['größtes JS-Asset roh', largest('js')?.size || 0, 320 * 1024],
  ['größtes JS-Asset gzip', largest('js')?.gzip || 0, 100 * 1024],
  ['größtes CSS-Asset roh', largest('css')?.size || 0, 80 * 1024],
  ['größtes CSS-Asset gzip', largest('css')?.gzip || 0, 20 * 1024],
  ['JS-/CSS-Assets gesamt roh', totals.raw, 420 * 1024],
  ['JS-/CSS-Assets gesamt gzip', totals.gzip, 125 * 1024],
];

const failures = budgets.filter(([, actual, limit]) => actual > limit);
for (const [label, actual, limit] of budgets) {
  console.log(`${actual <= limit ? 'PASS' : 'FAIL'} ${label}: ${actual} / ${limit} Bytes`);
}
for (const asset of assets.sort((first, second) => second.size - first.size)) {
  console.log(`ASSET ${asset.file}: ${asset.size} Bytes roh, ${asset.gzip} Bytes gzip`);
}
if (failures.length) process.exitCode = 1;

