import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = 'docs';
const assets = ['index.html', 'manifest.webmanifest'];
for (const dir of ['src', 'assets', 'vendor']) {
  for (const file of fs.readdirSync(path.join(root, dir), { recursive: true })) {
    const relative = dir + '/' + file;
    if (/\.(js|css|svg|png|woff2)$/.test(file) && fs.statSync(path.join(root, relative)).isFile())
      assets.push(relative);
  }
}
assets.sort();
const template = fs.readFileSync('scripts/templates/sw.js', 'utf8');
const hash = crypto.createHash('sha256').update(template);
for (const file of assets) hash.update(file).update(fs.readFileSync(path.join(root, file)));
const output = template
  .replace('__VERSION__', hash.digest('hex').slice(0, 16))
  .replace('__ASSETS__', JSON.stringify(assets, null, 2));
if (process.argv.includes('--check')) {
  if (!fs.existsSync('docs/sw.js') || fs.readFileSync('docs/sw.js', 'utf8') !== output)
    throw Error('Offline bundle is stale. Run npm run build:offline and commit docs/sw.js.');
  console.log(`PASS: offline release matches ${assets.length} local assets.`);
} else {
  fs.writeFileSync('docs/sw.js', output);
  console.log(`Offline release built with ${assets.length} local assets.`);
}
