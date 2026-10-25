import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const files = fs
  .readdirSync('docs/src')
  .filter((f) => f.endsWith('.js'))
  .map((f) => 'docs/src/' + f)
  .concat(
    fs
      .readdirSync('server')
      .filter((f) => f.endsWith('.js'))
      .map((f) => 'server/' + f),
  );
for (const file of files) {
  execFileSync(process.execPath, ['--check', file]);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    if (!fs.existsSync(path.resolve(path.dirname(file), match[1])))
      throw Error(`Missing import in ${file}: ${match[1]}`);
  }
}
const html = fs.readFileSync('docs/index.html', 'utf8');
if (/on(click|change|submit)=/.test(html)) throw Error('Inline event handler');
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!m[1].startsWith('http') && !fs.existsSync('docs/' + m[1]))
    throw Error('Missing asset: ' + m[1]);
}
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/sk_(live|test)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}/.test(content))
    throw Error('Possible credential in ' + file);
}
console.log(
  `PASS: ${files.length} modules parse, imports/assets resolve, no inline HTML event handlers or obvious payment secrets.`,
);
